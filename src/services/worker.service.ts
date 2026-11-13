/* eslint-disable security/detect-non-literal-fs-filename */

import type { Readable } from 'node:stream';

import { Injectable, Logger } from '@nestjs/common';
import { tee } from 'jutilities/node-stream';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import { CACHE_DIR } from '@/constants/fs.js';

import { NormalizedClsService } from './normalized-cls.service.js';

const MAX_STDERR_BYTES = 64 * 1024;

export interface CreateWorkerOptions {
  /** Passed to the worker AND mixed into the cache key (operation, payload...). */
  workerData?: unknown;
}

@Injectable()
export class WorkerService {
  /** cache path -> promise resolved (never rejected) when the producer settles. */
  private readonly inflight = new Map<string, Promise<void>>();

  private readonly logger = new Logger(WorkerService.name);

  constructor(private readonly cls: NormalizedClsService) {}

  /**
   * Returns the processed output. Served from CACHE_DIR when possible,
   * otherwise produced by a worker thread (and cached while streaming).
   * @param filename Worker entry file to run in a worker thread.
   * @param options Worker and cache options.
   * @returns Processed output stream.
   */
  async createWorker(
    filename: string,
    options: CreateWorkerOptions = {},
  ): Promise<Readable> {
    const source = this.cls.sourceStream().get() ;
    const baseKey = this.cls.cacheKey().get();
    // Hashing makes the key filesystem-safe (no "/" from base64, no traversal)
    // and separates different workers/operations that share the same file+query.
    const file = baseKey
      ? this.cachePath(baseKey, filename, options.workerData)
      : undefined;

    if (file) {
      let cached = await this.openCache(file);
      if (!cached && this.inflight.has(file)) {
        // Same request is already being produced: wait, then read its result.
        await this.inflight.get(file)!;
        cached = await this.openCache(file);
      }
      if (cached) {
        source?.destroy(); // nobody will read it: free socket / request body
        return cached;
      }
    }

    return this.spawn(filename, options, source, file);
  }

  /**
   * True when a finished, non-empty cache entry exists for this key.
   * @param file Cache file path.
   * @returns Whether the cache entry is usable.
   */
  async hasCache(file: string): Promise<boolean> {
    try {
      const stat = await fs.promises.stat(file);
      return stat.isFile() && stat.size > 0;
    } catch {
      return false;
    }
  }

  private cachePath(baseKey: string, filename: string, workerData: unknown) {
    const digest = createHash('sha256')
      .update(baseKey)
      .update('\0')
      .update(filename)
      .update('\0')
      .update(JSON.stringify(workerData ?? null))
      .digest('hex');
    return `${CACHE_DIR}/${digest}`;
  }

  /**
   * Opens the fd first, so a concurrent eviction (unlink) can't break an
   * in-progress read, and bumps mtime so eviction is LRU-ish.
   * @param file Cache entry path.
   * @returns Readable stream for an existing cache entry, or undefined.
   */
  private async openCache(
    file: string,
  ): Promise<Readable | undefined> {
    let handle: fs.promises.FileHandle;
    try {
      handle = await fs.promises.open(file, 'r');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size === 0) {
      await handle.close();
      return undefined;
    }
    const now = new Date();
    void handle.utimes(now, now).catch(() => undefined);
    return handle.createReadStream();
  }

  /**
   * Writes to a unique temp file and renames it into place only after BOTH the
   * stream finished and the worker exited cleanly, so readers never see a
   * partial/corrupt entry. Failures never affect the client response.
   * @param file Target cache path.
   * @param branch Source stream to persist.
   * @param succeeded Worker exit status.
   */
  private persist(
    file: string,
    branch: Readable,
    succeeded: Promise<boolean>,
  ) {
    const tmp = `${file}.${randomUUID()}.tmp`;
    let release!: () => void;
    this.inflight.set(
      file,
      new Promise<void>((resolve) => (release = resolve)),
    );

    const run = async () => {
      await fs.promises.mkdir(CACHE_DIR, { recursive: true });
      const [, ok] = await Promise.all([
        pipeline(
          branch,
          fs.createWriteStream(tmp, {
            highWaterMark: branch.readableHighWaterMark,
          }),
        ),
        succeeded,
      ]);
      if (!ok) throw new Error('worker did not finish cleanly');
      const stat = await fs.promises.stat(tmp);
      if (stat.size === 0) {
        throw new Error('empty output is not cached');
      }
      await fs.promises.rename(tmp, file);
    };

    void run()
      .catch(async (error: unknown) => {
        // The worker has already settled here, so its stdout has ended;
        // destroying this branch cannot stall the tee's other branch.
        branch.destroy();
        await fs.promises.rm(tmp, { force: true });
        this.logger.debug(`not cached (${file}): ${String(error)}`);
      })
      .finally(() => {
        this.inflight.delete(file);
        release();
      });
  }

  private spawn(
    filename: string,
    options: CreateWorkerOptions,
    source: Readable | undefined,
    file: string | undefined,
  ): Readable {
    const worker = new Worker(filename, {
      env: { ...process.env, FILE_FLY_WORKER: '1' },
      stderr: true,
      stdin: true,
      stdout: true,
      workerData: options.workerData,
    });

    // Never `throw` from an event handler: it becomes an uncaught exception.
    // Destroying stdout propagates the error to whoever consumes the stream.
    const fail = (error: Error) => {
      this.logger.warn(`worker ${filename} failed: ${error.message}`);
      if (!worker.stdout.destroyed) worker.stdout.destroy(error);
      void worker.terminate();
    };

    const stderrChunks: Buffer[] = [];
    let stderrSize = 0;
    worker.stderr.on('data', (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      if (stderrSize >= MAX_STDERR_BYTES) return;
      stderrChunks.push(buffer);
      stderrSize += buffer.length;
    });

    /** Resolves true only for a clean exit (code 0, nothing on stderr as error). */
    const succeeded = new Promise<boolean>((resolve) => {
      let settled = false;
      const settle = (ok: boolean) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };
      worker.once('error', (error: Error) => {
        fail(error);
        settle(false);
      });
      worker.once('exit', (code) => {
        // let late stderr chunks land before we look at them
        setImmediate(() => {
          if (code !== 0) {
            fail(
              new Error(
                `worker ${filename} exited with code ${code}: ${Buffer.concat(stderrChunks).toString()}`,
              ),
            );
          }
          settle(code === 0);
        });
      });
    });

    if (source) {
      // NOTE: the request signal fires as soon as the client finishes sending
      // (IncomingMessage closes), which would kill the pipeline mid-upload —
      // it is intentionally not used here.
      void pipeline(source, worker.stdin!).catch((error: unknown) => {
        // The worker may stop reading once it has what it needs (e.g. just the
        // container header): drop the branch instead of failing the worker output.
        this.logger.debug(`worker stdin closed: ${String(error)}`);
        if (!source.destroyed) source.destroy();
      });
    } else {
      worker.stdin!.end();
    }

    if (!file) return worker.stdout;

    const [cacheBranch, output] = tee({ source: worker.stdout });
    this.persist(file, cacheBranch, succeeded);
    return output;
  }
}

/**
 * Resolves a worker filename relative to the calling module's location.
 *
 * Services pass `'./name.worker.js'` to mean "same folder"; `new Worker(path)`
 * would otherwise resolve it against the process cwd and fail in production.
 * @param filename - Worker filename as declared by the caller (e.g. `'./worker/index.js'`).
 * @param metaUrl - `import.meta.url` of the module that declared the filename.
 * @returns Absolute path to the worker file.
 */
export function workerPath(filename: string, metaUrl: string): string {
  return fileURLToPath(new URL(filename, metaUrl));
}