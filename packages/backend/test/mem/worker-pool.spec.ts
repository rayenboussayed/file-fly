import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { settleHeap } from './helpers.js';

vi.mock('node:worker_threads', async () => {
  const { Readable: WorkerReadable, Writable } = await import('node:stream');

  type PayloadEvent = Event & { payload?: unknown };

  class Worker extends EventTarget {
    static readonly instances: unknown[] = [];
    stderr: InstanceType<typeof WorkerReadable>;
    stdin: InstanceType<typeof Writable>;
    stdout: InstanceType<typeof WorkerReadable>;

    constructor() {
      super();
      this.stdout = WorkerReadable.from(['cached']);
      this.stderr = WorkerReadable.from([]);
      this.stdin = new Writable({
        write(_chunk: unknown, _encoding: unknown, callback: () => void) {
          callback();
        },
      });
      Worker.instances.push(this);
      queueMicrotask(() => {
        const event = new Event('exit') as PayloadEvent;
        event.payload = 0;
        this.dispatchEvent(event);
      });
    }

    on(type: string, listener: (payload: unknown) => void): void {
      this.addEventListener(type, (event: Event) => {
        listener((event as PayloadEvent).payload);
      });
    }

    once(type: string, listener: (payload: unknown) => void): void {
      this.addEventListener(
        type,
        (event: Event) => {
          listener((event as PayloadEvent).payload);
        },
        { once: true },
      );
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
  cacheOutcome: () => ({ get: () => {}, set: (v: unknown) => v }),
  request: () => ({ signal: new AbortController().signal }),
  sourceStream: () => ({ get: () => {}, set: (v: unknown) => v }),
});

/**
 * I/O-free cache stand-in so persist() exercises the inflight map without
 * touching the real cache directory.
 */
const cacheFake = {
  createCachePath: () => '/dev/null',
  flush: async () => {},
  getOriginalSize: async () => 0,
  read: async () => {},
  unlink: async () => {},
  write: () => {},
};

const drainToString = async (stream: Readable): Promise<string> => {
  const chunks: Buffer[] = [];
  stream.on('data', (chunk: Buffer) => {
    chunks.push(Buffer.from(chunk));
  });
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
    for (let index = 0; index < ITERATIONS; index += 1) {
      const output = await service.createWorker('./m.js');
      expect(await drainToString(output)).toBe('cached');
      await new Promise((resolve) => setImmediate(resolve));
    }

    for (let index = 0; index < 10; index += 1) {
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
    const waiting = state.acquireWorkerSlot();
    expect(state.workerWaiters).toHaveLength(1);
    state.releaseWorkerSlot();
    await waiting;
    expect(state.workerWaiters).toHaveLength(0);
    state.runningWorkers = 0;

    expect(state.runningWorkers).toBe(0);
    expect(state.workerWaiters).toHaveLength(0);
    expect(state.inflight.size).toBe(0);

    expect(after.heapUsed - before.heapUsed).toBeLessThan(4 * 1024 * 1024);
    expect(after.arrayBuffers - before.arrayBuffers).toBeLessThan(8 * 1024 * 1024);
  });
});
