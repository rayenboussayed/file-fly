import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';

import { drainStream } from '@/utils/drain.js';

import { settleHeap } from './helpers.js';

/** Bytes discarded by one fake stream (4 MiB). */
const PAYLOAD_BYTES = 4 * 1024 * 1024;

/** Iterations in the measured loop. */
const ITERATIONS = 8;

describe('drainStream memory', () => {
  it('discards payloads without retaining them', async () => {
    // Warm up JIT/inline caches so they are not attributed to the leak.
    await drainStream(Readable.from([Buffer.alloc(PAYLOAD_BYTES)]));
    await settleHeap();
    const before = process.memoryUsage();

    for (let i = 0; i < ITERATIONS; i += 1) {
      const dropped = await drainStream(Readable.from([Buffer.alloc(PAYLOAD_BYTES)]));
      expect(dropped).toBe(PAYLOAD_BYTES);
    }

    await settleHeap();
    const after = process.memoryUsage();

    expect(after.heapUsed - before.heapUsed).toBeLessThan(4 * 1024 * 1024);
    expect(after.arrayBuffers - before.arrayBuffers).toBeLessThan(8 * 1024 * 1024);
  });
});
