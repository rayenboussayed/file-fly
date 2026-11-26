/* eslint-disable security/detect-non-literal-fs-filename */

import type { Readable } from 'node:stream';

import { Injectable, Logger } from '@nestjs/common';
import { StreamCache } from 'jutilities/node/stream/cache';
import { tee } from 'jutilities/node/stream/tee';
import { toBuffer } from 'jutilities/to';
import fs from 'node:fs';
import os from 'node:os';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import { CACHE_DIR, CACHE_TTL_MS } from '@/constants/fs.js';

import { NormalizedClsService } from './normalized-cls.service.js';

const MAX_STDERR_BYTES = 64 * 1024;

/**
 * Environment for spawned worker threads: only what first-party workers need
 * (paths, locales, log level, node/tmp dirs). Secrets such as METRICS_TOKEN,
 * AUTH_* or ClamAV credentials never cross into a worker.
 */
const WORKER_ENV_KEYS = [
  'CACHE_DIR',
  'HOME',
  'LANG',
  'LC_ALL',
  'LOG_LEVEL',
  'NODE_ENV',
  'PATH',
  'TESSERACT_DIR',
  'TESSERACT_POOL_SIZE',
  'TESSERACT_PRELOAD',
  'TESSERACT_RECYCLE_JOBS',
  'TESSERACT_TIMEOUT_MS',
  'TEMP',
  'TMP',
  'TMPDIR',
] as const;

/**
 * Builds the worker environment from WORKER_ENV_KEYS.
 * @returns A fresh env record; FILE_FLY_WORKER is always set to '1'.
 */
const workerEnv = (): Record<string, string> => {
  const env: Record<string, string> = {};
  const allowlist = new Set<string>(WORKER_ENV_KEYS);
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined || !allowlist.has(key)) continue;
    env[key] = value;
  }
  env.FILE_FLY_WORKER = '1';
  return env;
};

/** Options for spawning a worker thread. */
export interface CreateWorkerOptions {
  /** Passed to the worker AND mixed into the cache key (operation, payload...). */
  workerData?: unknown;
}

/** Spawns sibling worker threads for CPU-heavy media/document work and serves their output (with a shared stream cache). */
@Injectable()
export class WorkerService {
  private readonly cache = new StreamCache({
    directory: CACHE_DIR,
    onError: (error) => this.logger.debug(`cache write failed: ${String(error)}`),
    timeToLive: CACHE_TTL_MS,
  });

  /** cache key -> promise resolved (never rejected) when the producer settles. */
  private readonly inflight = new Map<string, Promise<void>>();

  private readonly logger = new Logger(WorkerService.name);

  /** Upper bound on concurrent worker threads; excess createWorker calls queue instead of forking unboundedly. */
  private readonly maxWorkers = Math.max(2, (os.cpus()?.length ?? 4) - 1);
  private runningWorkers = 0;
  private readonly workerWaiters: Array<() => void> = [];

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
    const key = baseKey ? this.keyFor(baseKey, filename, options.workerData) : undefined;

    if (key) {
      let size = await this.cache.getOriginalSize(key);
      if (!size && this.inflight.has(key)) {
        await this.inflight.get(key)!;            // wait for the in-flight producer
        size = await this.cache.getOriginalSize(key);
      }
      if (size && size > 0) {
        const cached = await this.cache.read({ key });
        if (cached) {
          // mtime drives LRU eviction; refresh it on every hit.
          void this.touch(key).catch(() => {});
          source?.destroy(); // nobody will read it: free socket / request body
          this.cls.cacheOutcome().set('hit');
          return cached;
        }
      }
    }

    if (key) this.cls.cacheOutcome().set('miss');
    return await this.spawn(filename, options, source, key);
  }

  /**
   * Waits until a worker slot is free, then takes it.
   */
  private async acquireWorkerSlot(): Promise<void> {
    while (this.runningWorkers >= this.maxWorkers) {
       
      await new Promise<void>((resolve) => this.workerWaiters.push(resolve));
    }
    this.runningWorkers += 1;
  }

  /**
   * Builds the cache key: parts joined with NUL so no component can smuggle separators.
   * @param baseKey - Deterministic base key from the request (file signature + query + hash).
   * @param filename - Worker entry filename mixed into the key.
   * @param workerData - Worker payload mixed into the key.
   * @returns The composite cache key.
   */
  private keyFor(baseKey: string, filename: string, workerData: unknown): string {
    // baseKey already encodes the request payload (file hash, query, body digest);
    // re-serializing the whole workerData here would duplicate it in memory for
    // no extra discrimination. The operation/inputFormat tag is all a consumer needs.
    const data = (workerData ?? {}) as Record<string, unknown>;
    const tag = JSON.stringify({
      inputFormat: typeof data.inputFormat === 'string' ? data.inputFormat : null,
      operation: typeof data.operation === 'string' ? data.operation : null,
    });
    return [baseKey, filename, tag].join('\0');
  }

  /**
   * Persists the finished branch via StreamCache (atomic tmp+rename, 0o600).
   * Empties are not servable: read path treats size===0 as a miss, so a 0-byte
   * entry is simply ignored until the janitor reaps it.
   * Failures never affect the client: the entry is unlinked once the worker has settled.
   * @param key Cache key.
   * @param branch Source stream to persist.
   * @param succeeded Worker exit status.
   */
  private persist(key: string, branch: Readable, succeeded: Promise<boolean>): void {
    // Assigned synchronously by the Promise executor below, before any await.
    let release!: () => void;
    const promise = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.inflight.set(key, promise);

    // Hand the branch to the cache immediately: a backpressured tee branch
    // nobody drains until the worker exits would stall `worker.stdout` and
    // deadlock the worker. Completion is gated on `succeeded` below instead,
    // so a failed worker never leaves a servable entry behind.
    this.cache.write({ key, readable: branch });

    const run = async (): Promise<void> => {
      const [ok] = await Promise.all([succeeded, this.cache.flush()]);
      if (!ok) {
        // The worker failed mid-stream: make sure its (possibly partial)
        // output is never served from the cache. flush() resolved only after
        // the fill finished, so this cannot delete an entry still being written.
        try {
          await this.cache.unlink(key);
        } catch {
          void 0;
        }
      }
    };

    void run()
      .catch((error: unknown) => {
        // The worker has already settled here, so destroying this branch cannot stall the tee's other branch.
        branch.destroy();
        this.logger.debug(`not cached (${key}): ${String(error)}`);
      })
      .finally(() => {
        this.inflight.delete(key);
        release();
      });
  }

  /**
   * Releases a worker slot, waking one queued caller if any.
   */
  private releaseWorkerSlot(): void {
    this.runningWorkers -= 1;
    const waiter = this.workerWaiters.shift();
    if (waiter) waiter();
  }

  private async spawn(
    filename: string,
    options: CreateWorkerOptions,
    source: Readable | undefined,
    key: string | undefined,
  ): Promise<Readable> {
    await this.acquireWorkerSlot();
    let worker: Worker;
    try {
      worker = new Worker(filename, {
        env: workerEnv(),
        stderr: true,
        stdin: true,
        stdout: true,
        workerData: options.workerData,
      });
    } catch (error) {
      this.releaseWorkerSlot();
      throw error;
    }

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
      if (stderrSize >= MAX_STDERR_BYTES) return;
      const buffer = toBuffer(chunk);
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
        this.releaseWorkerSlot();
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
      // stdin is available because the Worker is spawned with stdin: true.
      void pipeline(source, worker.stdin as NonNullable<typeof worker.stdin>).catch((error: unknown) => {
        // The worker may stop reading once it has what it needs (e.g. just the
        // container header): drop the branch instead of failing the worker output.
        this.logger.debug(`worker stdin closed: ${String(error)}`);
        if (!source.destroyed) source.destroy();
      });
    } else {
      // stdin is available because the Worker is spawned with stdin: true.
      (worker.stdin as NonNullable<typeof worker.stdin>).end();
    }

    if (!key) return worker.stdout;

    const [cacheBranch, output] = tee({ stream: worker.stdout });
    this.persist(key, cacheBranch, succeeded);
    return output;
  }

  /**
   * Refreshes the entry's mtime so the janitor's LRU eviction keeps hot entries.
   * @param key - Cache key of the entry.
   */
  private async touch(key: string): Promise<void> {
    const now = new Date();
    await fs.promises.utimes(this.cache.createCachePath(key), now, now);
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
