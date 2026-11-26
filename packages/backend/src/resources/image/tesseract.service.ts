// eslint-disable-next-line n/no-missing-import
import type { Worker } from 'tesseract.js';

import { Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { withTimeoutAsync } from 'jutilities/hof/timeout';
import fs from 'node:fs';
// eslint-disable-next-line n/no-missing-import
import { createWorker, OEM } from 'tesseract.js';

import { TESSERACT_DIR } from '@/constants/fs.js';
import { environment } from '@/environment.js';

import type { ImageOcrResult } from './type.js';

/** ISO 639-2 language code with an optional script suffix — tesseract's on-disk layout (`<code>.traineddata`). */
// eslint-disable-next-line security/detect-unsafe-regex -- bounded linear pattern ([a-z]{3} + optional _xx{3,4}); no nested quantifiers
const SINGLE_LANG_REGEX = /^[a-z]{3}(?:_[a-z]{3,4})?$/i;

interface Slot {
  busy: boolean;
  jobs: number;
  langs: string[];
  worker: Worker;
}

/**
 * Bounded pool of tesseract.js workers.
 *
 * Language data is downloaded on demand into {@link TESSERACT_DIR}. Each slot
 * handles one recognition job at a time; languages are switched with
 * `reinitialize` only when the requested set differs. Slots are recycled after
 * {@link environment.TESSERACT_RECYCLE_JOBS} jobs; a slot whose job failed is
 * retired instead of being returned to the pool (a zombie recognition could
 * otherwise interleave with the next caller on the same worker).
 */
/** Bounded pool of tesseract.js workers for `/image/ocr`; terminated on shutdown. */
@Injectable()
export class TesseractService implements OnModuleDestroy, OnModuleInit {
  private creating = 0;
  private destroying = false;
  private readonly logger = new Logger(TesseractService.name);
  private readonly slots: Slot[] = [];
  private readonly waiters: Array<() => void> = [];

  /**
   * Terminates every worker on shutdown and wakes pending acquire() callers
   * so they fail fast with 503 instead of waiting for a slot forever.
   */
  async onModuleDestroy(): Promise<void> {
    this.destroying = true;
    await Promise.allSettled(this.slots.map((slot) => slot.worker.terminate()));
    this.slots.length = 0;
    const waiters = this.waiters.splice(0);
    for (const waiter of waiters) waiter();
  }

  /**
   * Prepares the cache directory and warms the configured preload languages.
   */
  async onModuleInit(): Promise<void> {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await fs.promises.mkdir(TESSERACT_DIR, { recursive: true });
    const requested = environment.TESSERACT_PRELOAD.split(',')
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0);
    const langs = [...new Set(requested.filter((value) => {
      const valid = SINGLE_LANG_REGEX.test(value);
      if (!valid) {
        this.logger.warn(`Ignoring invalid TESSERACT_PRELOAD language code: ${value}`);
      }
      return valid;
    }))].toSorted((a, b) => a.localeCompare(b));
    if (langs.length > 0) {
      void this.warm(langs);
    }
  }

  /**
   * Recognizes text in the given image buffer.
   * @param buffer - Preprocessed (PNG) image bytes.
   * @param langs - Language codes to use (already normalized).
   * @returns Text with a per-line breakdown, normalized languages, confidence and wall time.
   */
  async recognize(buffer: Buffer, langs: string[]): Promise<ImageOcrResult> {
    const started = performance.now();
    const slot = await this.acquire(langs);
    let ok = false;
    try {
      const result = await withTimeoutAsync(
        () => slot.worker.recognize(buffer, {}, { blocks: true }),

        { signal: AbortSignal.timeout(environment.TESSERACT_TIMEOUT_MS) },
      )();
      const { data } = result;
      const lines = (data.blocks ?? []).flatMap((block) =>
        (block.paragraphs ?? []).flatMap((paragraph) =>
          (paragraph.lines ?? []).map((line) => ({
            confidence: Math.round(line.confidence * 100) / 100,
            // tesseract pads line text with a trailing newline.
            text: line.text.trimEnd(),
          })),),);
      ok = true;
      return {
        confidence: Math.round(data.confidence * 100) / 100,
        durationMs: Math.round(performance.now() - started),
        langs: [...langs],
        lines,
        text: data.text.trimEnd(),
      };
    } finally {
      slot.jobs += 1;
      if (!ok || slot.jobs >= environment.TESSERACT_RECYCLE_JOBS) {
        // Failed, timed-out, or recycled jobs go to retire(), not back to the pool.
        await this.retire(slot);
      } else {
        this.release(slot);
      }
    }
  }

  private async acquire(langs: string[]): Promise<Slot> {
    const key = langs.join('+');
    while (true) {
      if (this.destroying) {
        throw new ServiceUnavailableException('Tesseract worker pool is shutting down');
      }
      const slot = await this.tryAcquire(langs, key);
      if (slot) return slot;
      await new Promise<void>((resolve) => {
        this.waiters.push(resolve);
      });
    }
  }

  private release(slot: Slot): void {
    slot.busy = false;
    const waiter = this.waiters.shift();
    if (waiter) waiter();
  }

  /**
   * Terminates a slot and removes it from the pool, then wakes one waiter.
   * @param slot - Pool slot whose worker is being retired.
   */
  private async retire(slot: Slot): Promise<void> {
    try {
      await slot.worker.terminate();
    } catch (error) {
      this.logger.debug({ err: error }, 'worker termination failed during retire');
    }
    const index = this.slots.indexOf(slot);
    if (index !== -1) this.slots.splice(index, 1);
    const waiter = this.waiters.shift();
    if (waiter) waiter();
  }

  private async tryAcquire(langs: string[], key: string): Promise<null | Slot> {
    // 1. Idle slot with matching languages.
    const matching = this.slots.find((slot) => !slot.busy && slot.langs.join('+') === key);
    if (matching) {
      matching.busy = true;
      return matching;
    }

    // 2. Idle slot with different languages -> reinitialize.
    const idle = this.slots.find((slot) => !slot.busy);
    if (idle) {
      idle.busy = true;
      if (idle.langs.join('+') !== key) {
        try {
          await withTimeoutAsync(
            () => idle.worker.reinitialize(langs.join('+'), OEM.LSTM_ONLY),

            { signal: AbortSignal.timeout(environment.TESSERACT_TIMEOUT_MS) },
          )();
        } catch (error) {
          // A failed reinitialize must not wedge the slot in the pool forever.
          await this.retire(idle);
          throw error;
        }
        idle.langs = [...langs];
      }
      return idle;
    }

    // 3. Capacity to create a new slot.
    if (this.slots.length + this.creating < environment.TESSERACT_POOL_SIZE) {
      this.creating += 1;
      const workerPromise = createWorker(langs, OEM.LSTM_ONLY, {
        cachePath: TESSERACT_DIR,
        gzip: true,
        logger: () => {},
      });
      try {
        const worker = await withTimeoutAsync(
          () => workerPromise,

          { signal: AbortSignal.timeout(environment.TESSERACT_TIMEOUT_MS) },
        )();
        const slot: Slot = { busy: true, jobs: 0, langs: [...langs], worker };
        this.slots.push(slot);
        return slot;
      } catch (error) {
        void workerPromise.then((worker) => worker.terminate()).catch(() => {});
        throw error;
      } finally {
        this.creating -= 1;
      }
    }

    return null;
  }

  private async warm(langs: string[]): Promise<void> {
    try {
      const slot = await this.acquire(langs);
      this.release(slot);
    } catch (error) {
      this.logger.warn(`tesseract preload failed: ${String(error)}`);
    }
  }
}
