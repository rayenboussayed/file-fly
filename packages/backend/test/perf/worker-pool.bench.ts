import { Readable } from 'node:stream';
import { bench, describe, vi } from 'vitest';

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

import { WorkerService } from '@/services/worker.service.js';

const makeCls = (): unknown => ({
  cacheKey: () => ({ get: () => {}, set: (v: unknown) => v }),
  cacheOutcome: () => ({ get: () => {}, set: (v: unknown) => v }),
  request: () => ({ signal: new AbortController().signal }),
  sourceStream: () => ({ get: () => {}, set: (v: unknown) => v }),
});

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

describe('worker pool', () => {
  const service = new WorkerService(makeCls() as never);

  bench(
    'acquires and releases a worker slot',
    async () => {
      const output = await service.createWorker('./m.js');
      const text = await drainToString(output);
      // Consume the result so the measured work is not dead-code-eliminated.
      if (text !== 'cached') {
        throw new Error('unexpected worker output');
      }
      await new Promise((resolve) => setImmediate(resolve));
    },
    { throws: true },
  );
});
