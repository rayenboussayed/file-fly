import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { settleHeap } from './helpers.js';

vi.mock('node:worker_threads', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- vi.mock factories need a synchronous require for node builtins
  const { EventEmitter } = require('node:events');
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- vi.mock factories need a synchronous require for node builtins
  const { Readable, Writable } = require('node:stream');

  class Worker extends EventEmitter {
    static readonly instances: unknown[] = [];
    stderr: unknown;
    stdin: unknown;
    stdout: unknown;
    constructor() {
      super();
      this.stdout = Readable.from(['cached']);
      this.stderr = new Readable({ read() { this.push(null); } });
      this.stdin = new Writable({ write(_c: unknown, _e: unknown, cb: () => void) { cb(); } });
      Worker.instances.push(this);
      process.nextTick(() => this.emit('exit', 0));
    }
    terminate() {
      return Promise.resolve();
    }
  }
  return { Worker };
});

import { Worker } from 'node:worker_threads';

import { WorkerService } from '@/services/worker.service.js';

const makeCls = (): unknown => ({
  cacheKey: () => ({ get: () => 'worker-pool-key', set: (v: unknown) => v }),
  cacheOutcome: () => ({ get: () => undefined, set: (v: unknown) => v }),
  request: () => ({ signal: new AbortController().signal }),
  sourceStream: () => ({ get: () => undefined, set: (v: unknown) => v }),
});

/**
 * I/O-free cache stand-in so persist() exercises the inflight map without
 * touching the real cache directory.
 */
const cacheFake = {
  createCachePath: () => '/dev/null',
  flush: async () => undefined,
  getOriginalSize: async () => 0,
  read: async () => undefined,
  unlink: async () => undefined,
  write: () => undefined,
};

const drainToString = async (stream: Readable): Promise<string> => {
  const chunks: Buffer[] = [];
  stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
  await new Promise<void>((resolve, reject) => {
    stream.once('end', () => resolve());
    stream.once('error', reject);
  });
  return Buffer.concat(chunks).toString();
};

describe('worker pool memory', () => {
  beforeEach(() => {
    (Worker as unknown as { instances: unknown[] }).instances.length = 0;
  });

  it('keeps the slot queue and inflight map bounded across repeated calls', async () => {
    const service = new WorkerService(makeCls() as never);
    // Narrow cast: `cache` is private but swappable for an I/O-free fake.
    (service as unknown as { cache: unknown }).cache = cacheFake;
    const warm = await service.createWorker('./m.js');
    expect(await drainToString(warm)).toBe('cached');
    await new Promise((resolve) => setImmediate(resolve));
    await settleHeap();
    const before = process.memoryUsage();

    const ITERATIONS = 20;
    for (let i = 0; i < ITERATIONS; i += 1) {
      const output = await service.createWorker('./m.js');
      expect(await drainToString(output)).toBe('cached');
      await new Promise((resolve) => setImmediate(resolve));
    }

    for (let i = 0; i < 10; i += 1) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    await settleHeap();
    const after = process.memoryUsage();

    const state = service as unknown as {
      acquireWorkerSlot(): Promise<void>;
      inflight: Map<unknown, unknown>;
      maxWorkers: number;
      releaseWorkerSlot(): void;
      runningWorkers: number;
      workerWaiters: unknown[];
    };

    // Drive the contention path directly: sequential calls never fill the queue.
    state.runningWorkers = state.maxWorkers;
    let acquired = false;
    const waiting = state.acquireWorkerSlot().then(() => {
      acquired = true;
      return undefined;
    });
    expect(state.workerWaiters).toHaveLength(1);
    state.releaseWorkerSlot();
    await waiting;
    expect(acquired).toBe(true);
    expect(state.workerWaiters).toHaveLength(0);
    state.runningWorkers = 0;

    expect(state.runningWorkers).toBe(0);
    expect(state.workerWaiters).toHaveLength(0);
    expect(state.inflight.size).toBe(0);

    expect(after.heapUsed - before.heapUsed).toBeLessThan(4 * 1024 * 1024);
    expect(after.arrayBuffers - before.arrayBuffers).toBeLessThan(8 * 1024 * 1024);
  });
});
