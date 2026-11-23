import { Readable } from 'node:stream';
import { bench, describe, vi } from 'vitest';

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

import { WorkerService } from '@/services/worker.service.js';

const makeCls = (): unknown => ({
  cacheKey: () => ({ get: () => undefined, set: (v: unknown) => v }),
  cacheOutcome: () => ({ get: () => undefined, set: (v: unknown) => v }),
  request: () => ({ signal: new AbortController().signal }),
  sourceStream: () => ({ get: () => undefined, set: (v: unknown) => v }),
});

const drainToString = async (stream: Readable): Promise<string> => {
  const chunks: Buffer[] = [];
  stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
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
