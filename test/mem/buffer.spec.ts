import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';

import { bufferStream } from '@/utils/buffer.js';

import { settleHeap } from './helpers.js';

/** Bytes buffered by one fake upload (2 MiB). */
const PAYLOAD_BYTES = 2 * 1024 * 1024;

/** Iterations in the measured loop; enough pressure to trip weak GC accounting. */
const ITERATIONS = 8;

/**
 * Builds a fresh 2 MiB synthetic upload stream.
 * @returns A readable yielding zero-filled chunks.
 */
function fakeUpload(): Readable {
  return Readable.from([Buffer.alloc(PAYLOAD_BYTES)]);
}

describe('bufferStream memory', () => {
  it('stays flat across repeated buffer operations', async () => {
    // Warm up JIT/inline caches so they are not attributed to the leak.
    await bufferStream(fakeUpload());
    await settleHeap();
    const before = process.memoryUsage();

    for (let i = 0; i < ITERATIONS; i += 1) {
      const buffered = await bufferStream(fakeUpload());
      expect(buffered).toHaveLength(PAYLOAD_BYTES);
    }

    await settleHeap();
    const after = process.memoryUsage();

    // Buffers are freed when the caller drops them; the native payload shows
    // up in `arrayBuffers`, the bookkeeping in `heapUsed`.
    expect(after.heapUsed - before.heapUsed).toBeLessThan(4 * 1024 * 1024);
    expect(after.arrayBuffers - before.arrayBuffers).toBeLessThan(8 * 1024 * 1024);
  });
});
