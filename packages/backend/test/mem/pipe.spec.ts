import { Readable, Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';

import { pipeToReply } from '@/utils/pipe.js';

import { settleHeap } from './helpers.js';

/** Iterations in the measured loop. */
const ITERATIONS = 5;

/**
 * Builds a raw response whose first write fails, like a client that
 * disconnects before the body is accepted.
 * @returns The writable that errors on the first write.
 */
function failingRaw(): Writable {
  return new Writable({
    write(_chunk: Buffer, _encoding, callback) {
      callback(new Error('simulated client disconnect'));
    },
  });
}

/**
 * Builds a source stream that simulates a worker output tee branch.
 * @returns A readable yielding a small deterministic payload.
 */
function fakeSource(): Readable {
  return Readable.from([Buffer.from('ab'), Buffer.from('cd'), Buffer.from('ef')]);
}

describe('pipeToReply memory', () => {
  it('drains the source on failure without retaining it across calls', async () => {
    // Warm up JIT/inline caches so they are not attributed to the leak.
    const warmSource = fakeSource();
    await pipeToReply(warmSource, { raw: failingRaw() } as never);
    await settleHeap();
    const before = process.memoryUsage();

    for (let i = 0; i < ITERATIONS; i += 1) {
      const source = fakeSource();
      await pipeToReply(source, { raw: failingRaw() } as never);
      // The sibling tee branch must see EOF for the cache persist to complete.
      expect(source.readableEnded).toBe(true);
    }

    await settleHeap();
    const after = process.memoryUsage();

    expect(after.heapUsed - before.heapUsed).toBeLessThan(4 * 1024 * 1024);
    expect(after.arrayBuffers - before.arrayBuffers).toBeLessThan(8 * 1024 * 1024);
  });
});
