import { Readable, Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';

import { pipeToReply } from '@/utils/pipe.js';

import { settleHeap } from './helpers.js';

const ITERATIONS = 5;

/**
 * Builds a short source stream for the success path.
 * @returns A readable stream of three buffers.
 */
function fakeSource(): Readable {
  return Readable.from([Buffer.from('ab'), Buffer.from('cd'), Buffer.from('ef')]);
}

/**
 * Builds a raw sink that absorbs all writes.
 * @returns A writable that accepts every chunk.
 */
function succeedingRaw(): Writable {
  return new Writable({
    write(_chunk: Buffer, _encoding, callback) {
      callback();
    },
  });
}

describe('pipeToReply success memory', () => {
  it('streams the source to completion without retaining it across calls', async () => {
    const warmSource = fakeSource();
    await pipeToReply(warmSource, { raw: succeedingRaw() } as never);
    await settleHeap();
    const before = process.memoryUsage();

    for (let index = 0; index < ITERATIONS; index += 1) {
      const source = fakeSource();
      await pipeToReply(source, { raw: succeedingRaw() } as never);
      expect(source.readableEnded).toBe(true);
    }

    await settleHeap();
    const after = process.memoryUsage();

    expect(after.heapUsed - before.heapUsed).toBeLessThan(4 * 1024 * 1024);
    expect(after.arrayBuffers - before.arrayBuffers).toBeLessThan(8 * 1024 * 1024);
  });
});
