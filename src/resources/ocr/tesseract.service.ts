// eslint-disable-next-line n/no-missing-import
import type { Worker } from 'tesseract.js';

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import fs from 'node:fs';
// eslint-disable-next-line n/no-missing-import
import { createWorker, OEM } from 'tesseract.js';

import { TESSERACT_DIR } from '@/constants/fs.js';
import { environment } from '@/environment.js';

/**
 * Result returned by {@link TesseractService.recognize}.
 */
export interface OcrResult {
  /** Overall confidence, 0-100, rounded to two decimals. */
  confidence: number;
  /** Extracted text. */
  text: string;
}

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
 * {@link environment.TESSERACT_RECYCLE_JOBS} jobs.
 */
@Injectable()
export class TesseractService implements OnModuleDestroy, OnModuleInit {
  private creating = 0;
  private readonly slots: Slot[] = [];
  private readonly waiters: Array<() => void> = [];

  /**
   * Terminates every worker on shutdown.
   */
  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled(this.slots.map((slot) => slot.worker.terminate()));
    this.slots.length = 0;
    this.waiters.length = 0;
  }

  /**
   * Prepares the cache directory and warms the configured preload languages.
   */
  async onModuleInit(): Promise<void> {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await fs.promises.mkdir(TESSERACT_DIR, { recursive: true });
    const langs = environment.TESSERACT_PRELOAD.split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (langs.length > 0) {
      void this.warm(langs);
    }
  }

  /**
   * Recognizes text in the given image buffer.
   * @param buffer - Raw image bytes.
   * @param langs - Language codes to use (already normalized).
   * @returns Extracted text and confidence.
   */
  async recognize(buffer: Buffer, langs: string[]): Promise<OcrResult> {
    const slot = await this.acquire(langs);
    try {
      const result = await this.withTimeout(
        slot.worker.recognize(buffer),
        environment.TESSERACT_TIMEOUT_MS,
      );
      const data = (result as { data: { confidence: number; text: string; } }).data;
      return {
        confidence: Math.round(data.confidence * 100) / 100,
        text: data.text,
      };
    } finally {
      slot.jobs += 1;
      if (slot.jobs >= environment.TESSERACT_RECYCLE_JOBS) {
        await slot.worker.terminate().catch(() => undefined);
        const index = this.slots.indexOf(slot);
        if (index >= 0) this.slots.splice(index, 1);
        const waiter = this.waiters.shift();
        if (waiter) waiter();
      } else {
        this.release(slot);
      }
    }
  }

  private async acquire(langs: string[]): Promise<Slot> {
    const key = langs.join('+');
    while (true) {
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
        await this.withTimeout(
          idle.worker.reinitialize(langs.join('+'), OEM.LSTM_ONLY),
          environment.TESSERACT_TIMEOUT_MS,
        );
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
        const worker = await this.withTimeout(workerPromise, environment.TESSERACT_TIMEOUT_MS);
        const slot: Slot = { busy: true, jobs: 0, langs: [...langs], worker };
        this.slots.push(slot);
        return slot;
      } catch (error) {
        void workerPromise.then((worker) => worker.terminate()).catch(() => undefined);
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
      console.warn('tesseract preload failed:', error);
    }
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('tesseract timeout')), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}