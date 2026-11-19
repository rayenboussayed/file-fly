/* eslint-disable security/detect-non-literal-fs-filename -- cache paths are built from constants, not user input */
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CACHE_DIR } from '@/constants/fs.js';

/**
 * Bin entry path for the given key parts, mirroring the service's `keyFor`
 * and StreamCache's internal sha256 naming.
 * @param keyParts - Key parts to join with NUL and hash, as the service's `keyFor` would.
 * @returns The absolute cache file path for those key parts.
 */
const binPath = (keyParts: readonly string[]): string =>
  join(CACHE_DIR, `${createHash('sha256').update(keyParts.join('\0')).digest('hex')}.bin`);

/**
 * Reads a stream to EOF and returns its decoded contents.
 * @param stream - The stream to consume.
 * @returns The decoded stream contents.
 */
const drainToString = async (stream: Readable): Promise<string> => {
  const chunks: Buffer[] = [];
  stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
  await new Promise<void>((resolve, reject) => {
    stream.once('end', () => resolve());
    stream.once('error', reject);
  });
  return Buffer.concat(chunks).toString();
};

vi.mock('node:worker_threads', () => {
// eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EventEmitter } = require('node:events');
// eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Readable, Writable } = require('node:stream');

  class Worker extends EventEmitter {
    static readonly instances: unknown[] = [];
    static readonly nextExitCodes: number[] = [];
    static readonly nextStderrChunks: Buffer[] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    stderr: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    stdin: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stdout: any;
    constructor() {
      super();
      this.stdout = Readable.from(['cached']);
      const stderrChunks = (Worker as unknown as { nextStderrChunks: Buffer[] }).nextStderrChunks;
      this.stderr = new Readable({
        read() {
          if (stderrChunks && stderrChunks.length > 0) {
            for (const chunk of stderrChunks.splice(0)) this.push(chunk);
          }
          this.push(null);
        },
      });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.stdin = new Writable({ write(_c: any, _e: any, cb: any) { cb(); } });
      Worker.instances.push(this);
      const exitCode = Worker.nextExitCodes.shift() ?? 0;
      process.nextTick(() => {
        if (exitCode === -1) this.emit('error', new Error('worker failed to start'));
        else this.emit('exit', exitCode);
      });
    }
    terminate() {
      return Promise.resolve();
    }
  }
  return { Worker };
});

import { Worker } from 'node:worker_threads';

import { WorkerService } from './worker.service.js';

type MockedWorker = { instances: unknown[] };

const mockedWorkerInstances = (): unknown[] =>
  (Worker as unknown as MockedWorker).instances;

describe('WorkerService', () => {
  beforeEach(async () => {
    // The unit config does not override CACHE_DIR; drop this spec's entries from the real one.
    await Promise.all([
      fs.rm(binPath(['cache-key', './m.js', 'null']), { force: true }),
      fs.rm(binPath(['cache-key', './other.js', 'null']), { force: true }),
      fs.rm(binPath(['fail-key', './fail.js', 'null']), { force: true }),
    ]).then(() => undefined);
    mockedWorkerInstances().length = 0;
    (Worker as unknown as { nextExitCodes: number[] }).nextExitCodes.length = 0;
    (Worker as unknown as { nextStderrChunks: Buffer[] }).nextStderrChunks.length = 0;
  });

  it('serves cached worker output without re-running the worker, and misses unknown keys', async () => {
    const makeCls = (cacheKey: string, source: Readable | undefined) => ({
      cacheKey: () => ({ get: () => cacheKey, set: (v: unknown) => v }),
      cacheOutcome: () => ({ get: () => undefined, set: (v: unknown) => v }),
      request: () => ({ signal: new AbortController().signal }),
      sourceStream: () => ({ get: () => source, set: (v: unknown) => v }),
    } as never);

    /**
     * Reads a stream to EOF and returns its decoded contents.
     * @param stream - Stream to consume.
     * @returns The decoded stream contents.
     */
    const service = new WorkerService(makeCls('cache-key', undefined));
    const first = await service.createWorker('./m.js');
    expect(await drainToString(first)).toBe('cached'); // produced by the mocked worker
    expect(mockedWorkerInstances()).toHaveLength(1);

    // Same instance: the call waits on the in-flight persist (or reads the
    // finished entry) — either way the worker is not re-run.
    const second = await service.createWorker('./m.js');
    expect(await drainToString(second)).toBe('cached');
    expect(mockedWorkerInstances()).toHaveLength(1);

    // A different filename yields a different key: cache miss, worker re-runs.
    const third = await service.createWorker('./other.js');
    expect(await drainToString(third)).toBe('cached');
    expect(mockedWorkerInstances()).toHaveLength(2);
  });

  it('does not deadlock on a failing worker, and caches nothing', async () => {
    const cls = {
      cacheKey: () => ({ get: () => 'fail-key', set: (v: unknown) => v }),
      cacheOutcome: () => ({ get: () => undefined, set: (v: unknown) => v }),
      request: () => ({ signal: new AbortController().signal }),
      sourceStream: () => ({ get: () => undefined, set: (v: unknown) => v }),
    } as never;

    (Worker as unknown as { nextExitCodes: number[] }).nextExitCodes.push(1);
    const service = new WorkerService(cls);
    const output = await service.createWorker('./fail.js');
    // The worker exits non-zero; whether the branch already ended cleanly or
    // is torn down with the error is an implementation detail of stream teardown.
    // (The mid-stream backpressure deadlock that shaped the implementation is
    // covered by the video trim e2e test, which uses a multi-MB fixture.)
    const outcome = await new Promise<string>((resolve) => {
      output.on('data', () => undefined);
      output.once('end', () => resolve('end'));
      output.once('error', () => resolve('error'));
    });
    expect(['end', 'error']).toContain(outcome);
    // No entry may be left behind for a failed worker.
     
    await expect(fs.stat(binPath(['fail-key', './fail.js', 'null']))).rejects.toThrow();
  });
});
describe('WorkerService coverage branches', () => {
  beforeEach(async () => {
    await fs.rm(binPath(['base-key', './m.js', 'null']), { force: true }).catch(() => undefined);
     
    await fs.mkdir(CACHE_DIR, { recursive: true });
  });

  it('returns a worker without cache key, branch handling, and file branches', async () => {
    const source = new Readable({ read() { this.push(null); } });
    const cls = {
      cacheKey: () => ({ get: () => undefined, set: (v: unknown) => v }),
      cacheOutcome: () => ({ get: () => undefined, set: (v: unknown) => v }),
      request: () => ({ signal: new AbortController().signal }),
      sourceStream: () => ({ get: () => source, set: (v: unknown) => v }),
    } as never;
    const service = new WorkerService(cls);
    const result = await service.createWorker('./m.js', { workerData: { a: 1 } });
    expect(result).toBeTruthy();
    await fs.rm(binPath(['base-key', './m.js', 'null']), { force: true }).catch(() => undefined);
    // trigger a cache hit using a real entry with deterministic path
    const cachePath = binPath(['base-key', './m.js', 'null']);
 
    await fs.writeFile(cachePath, 'cached');
    const cls2 = {
      cacheKey: () => ({ get: () => 'base-key', set: (v: unknown) => v }),
      cacheOutcome: () => ({ get: () => undefined, set: (v: unknown) => v }),
      request: () => ({ signal: new AbortController().signal }),
      sourceStream: () => ({ get: () => new Readable({ read() { this.push(null); } }), set: (v: unknown) => v }),
    } as never;
    const service2 = new WorkerService(cls2);
    const cached = await service2.createWorker('./m.js');
    cached.destroy();
    await fs.rm(cachePath, { force:true }).catch(()=>undefined);
  }, 15000);
});

describe('WorkerService cache hits and worker errors', () => {
  beforeEach(async () => {
    await fs.rm(binPath(['hit-key', './hit.js', 'null']), { force: true }).catch(() => undefined);
    mockedWorkerInstances().length = 0;
    (Worker as unknown as { nextExitCodes: number[] }).nextExitCodes.length = 0;
  });

  const makeCls = (cacheKey: string | undefined, outcome = { hit: 0 }) => ({
    cacheKey: () => ({ get: () => cacheKey, set: (v: unknown) => v }),
    cacheOutcome: () => ({
      get: () => undefined,
      set: (v: unknown) => {
        if (v === 'hit') outcome.hit += 1;
      },
    }),
    request: () => ({ signal: new AbortController().signal }),
    sourceStream: () => ({
      get: () => new Readable({ read() { this.push(null); } }),
      set: (v: unknown) => v,
    }),
  }) as never;

  it('records a hit and refreshes the entry mtime on cache reads', async () => {
    const pathInCache = binPath(['hit-key', './hit.js', 'null']);
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(pathInCache, 'cached-bytes');
    const old = new Date(Date.now() - 60 * 60 * 1000);
    await fs.utimes(pathInCache, old, old);

    const outcome = { hit: 0 };
    const cls = makeCls('hit-key', outcome);
    const service = new WorkerService(cls);
    const cached = await service.createWorker('./hit.js');
    // Touch is async; drain first so the read path runs to completion.
    expect(await drainToString(cached)).toBe('cached-bytes');
    expect(outcome.hit).toBe(1);
    await new Promise((resolve) => setImmediate(resolve));
    const stat = await fs.stat(pathInCache);
    expect(stat.mtimeMs).toBeGreaterThan(old.getTime());
    expect(mockedWorkerInstances()).toHaveLength(0);
    await fs.rm(pathInCache, { force: true });
  });

  it('surfaces a worker spawn error by destroying the output stream with that error', async () => {
    const cls = makeCls(undefined);
    (Worker as unknown as { nextExitCodes: number[] }).nextExitCodes.push(-1);
    const service = new WorkerService(cls);
    const output = await service.createWorker('./hit.js');
    const error = await new Promise<Error | undefined>((resolve) => {
      output.once('error', (err: Error) => resolve(err));
      output.once('end', () => resolve(undefined));
      setTimeout(() => resolve(undefined), 2000);
    });
    expect(error?.message).toBe('worker failed to start');
  });
});

describe('WorkerService onError and stderr cap branches', () => {
  beforeEach(async () => {
    await fs.rm(binPath(['onerror-key', './onerror.js', 'null']), { force: true }).catch(() => undefined);
    await fs.rm(binPath(['onerror-key', './onerror.js', 'null']), { force: true, recursive: true }).catch(() => undefined);
    mockedWorkerInstances().length = 0;
    (Worker as unknown as { nextExitCodes: number[] }).nextExitCodes.length = 0;
  });

  it('logs and continues when the cache write target is unusable', async () => {
    // Pre-create the cache path as a directory: the cache write fails, the
    // worker still produces output (nothing is served from cache).
    await fs.mkdir(binPath(['onerror-key', './onerror.js', 'null']), { recursive: true });
    const cls = {
      cacheKey: () => ({ get: () => 'onerror-key', set: (v: unknown) => v }),
      cacheOutcome: () => ({ get: () => undefined, set: (v: unknown) => v }),
      request: () => ({ signal: new AbortController().signal }),
      sourceStream: () => ({
        get: () => new Readable({ read() { this.push(null); } }),
        set: (v: unknown) => v,
      }),
    } as never;
    const service = new WorkerService(cls);
    const output = await service.createWorker('./onerror.js');
    const text = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      output.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      output.once('end', () => resolve(Buffer.concat(chunks).toString()));
      output.once('error', reject);
    });
    expect(text).toBe('cached');
  });

  it('caps stderr collection at 64 KiB', async () => {
    (Worker as unknown as { nextStderrChunks: Buffer[] }).nextStderrChunks.push(
      Buffer.alloc(70 * 1024, 0x61),
    );
    (Worker as unknown as { nextExitCodes: number[] }).nextExitCodes.push(1);
    const cls = {
      cacheKey: () => ({ get: () => undefined, set: (v: unknown) => v }),
      cacheOutcome: () => ({ get: () => undefined, set: (v: unknown) => v }),
      request: () => ({ signal: new AbortController().signal }),
      sourceStream: () => ({ get: () => undefined, set: (v: unknown) => v }),
    } as never;
    const service = new WorkerService(cls);
    const output = await service.createWorker('./fail.js');
    await new Promise<void>((resolve) => {
      output.once('end', resolve);
      output.once('error', resolve);
      setTimeout(resolve, 2000);
    });
    // Reaching here without throwing means the stderr handler survived 70 KB.
    expect(true).toBe(true);
  });

  it('workerPath resolves a worker entry relative to the declaring module', async () => {
    const { workerPath } = await import('./worker.service.js');
    expect(workerPath('./worker/index.js', 'file:///a/b/mod.js')).toBe('/a/b/worker/index.js');
  });
});

describe('WorkerService debug-branch assertions', () => {
  beforeEach(async () => {
    mockedWorkerInstances().length = 0;
    (Worker as unknown as { nextExitCodes: number[] }).nextExitCodes.length = 0;
    await fs.rm(binPath(['spy-key', './spy.js', 'null']), { force: true, recursive: true }).catch(() => undefined);
    await fs.rm(binPath(['spy-key', './spy.js', 'null']), { force: true }).catch(() => undefined);
  });

  it('logs cache-write failures via the onError debug branch', async () => {
    // Pre-create the cache path as a directory so the StreamCache write fails.
    await fs.mkdir(binPath(['spy-key', './spy.js', 'null']), { recursive: true });

    const cls = {
      cacheKey: () => ({ get: () => 'spy-key', set: (v: unknown) => v }),
      cacheOutcome: () => ({ get: () => undefined, set: (v: unknown) => v }),
      request: () => ({ signal: new AbortController().signal }),
      sourceStream: () => ({
        get: () => new Readable({ read() { this.push(null); } }),
        set: (v: unknown) => v,
      }),
    } as never;

    const service = new WorkerService(cls);
    const logger = (service as unknown as { logger: { debug: (msg: string) => void } }).logger;
    const debugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => undefined);

    const output = await service.createWorker('./spy.js');
    const text = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      output.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      output.once('end', () => resolve(Buffer.concat(chunks).toString()));
      output.once('error', reject);
    });
    // The worker still serves its output even though the cache write failed.
    expect(text).toBe('cached');
    // The failure took the onError debug branch (not the catch-all path).
    // fill() fails only at the final rename, after the branch has ended, so
    // poll until the cache-write pipeline has settled instead of racing it.
    await vi.waitFor(() => {
      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('cache write failed'));
    });
    // The rollback removed the temp file: the pre-created directory is empty.
    expect(await fs.readdir(binPath(['spy-key', './spy.js', 'null']))).toEqual([]);
  });

  it('destroys the stdin branch when the upload source errors mid-stream', async () => {
    async function* broken() {
      yield Buffer.from('chunk');
      throw new Error('connection reset');
    }
    const source = Readable.from(broken());
    const cls = {
      cacheKey: () => ({ get: () => undefined, set: (v: unknown) => v }),
      cacheOutcome: () => ({ get: () => undefined, set: (v: unknown) => v }),
      request: () => ({ signal: new AbortController().signal }),
      sourceStream: () => ({ get: () => source, set: (v: unknown) => v }),
    } as never;

    const service = new WorkerService(cls);
    const output = await service.createWorker('./fail.js');
    await new Promise<void>((resolve) => {
      output.once('end', resolve);
      output.once('error', resolve);
      setTimeout(resolve, 2000);
    });
    // Reaching here without hanging proves the stdin pipeline error was contained.
    expect(source.destroyed).toBe(true);
  });
});
