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

vi.mock('node:worker_threads', () => {
// eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EventEmitter } = require('node:events');
// eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Readable, Writable } = require('node:stream');

  class Worker extends EventEmitter {
    static readonly instances: unknown[] = [];
    static readonly nextExitCodes: number[] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    stderr: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    stdin: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stdout: any;
    constructor() {
      super();
      this.stdout = Readable.from(['cached']);
      this.stderr = new Readable({ read() { this.push(null); } });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.stdin = new Writable({ write(_c: any, _e: any, cb: any) { cb(); } });
      Worker.instances.push(this);
      const exitCode = Worker.nextExitCodes.shift() ?? 0;
      process.nextTick(() => this.emit('exit', exitCode));
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
    const drain = async (stream: Readable): Promise<string> => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      await new Promise<void>((resolve, reject) => {
        stream.once('end', () => resolve());
        stream.once('error', reject);
      });
      return Buffer.concat(chunks).toString();
    };

    const service = new WorkerService(makeCls('cache-key', undefined));
    const first = await service.createWorker('./m.js');
    expect(await drain(first)).toBe('cached'); // produced by the mocked worker
    expect(mockedWorkerInstances()).toHaveLength(1);

    // Same instance: the call waits on the in-flight persist (or reads the
    // finished entry) — either way the worker is not re-run.
    const second = await service.createWorker('./m.js');
    expect(await drain(second)).toBe('cached');
    expect(mockedWorkerInstances()).toHaveLength(1);

    // A different filename yields a different key: cache miss, worker re-runs.
    const third = await service.createWorker('./other.js');
    expect(await drain(third)).toBe('cached');
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
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- binPath is built from constants, not user input
    await expect(fs.stat(binPath(['fail-key', './fail.js', 'null']))).rejects.toThrow();
  });
});
describe('WorkerService coverage branches', () => {
  beforeEach(async () => {
    await fs.rm(binPath(['base-key', './m.js', 'null']), { force: true }).catch(() => undefined);
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- CACHE_DIR from src/constants/fs.ts, not user input
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
// eslint-disable-next-line security/detect-non-literal-fs-filename
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
