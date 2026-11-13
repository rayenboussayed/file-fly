import { Readable } from 'node:stream';
import { bench, describe } from 'vitest';

import { drainStream } from '@/utils/drain.js';

/** Bytes dropped per iteration (4 MiB of discarded media). */
const PAYLOAD_BYTES = 4 * 1024 * 1024;

describe('drainStream', () => {
  bench('discards a 4 MiB stream', async () => {
    const dropped = await drainStream(
      Readable.from([Buffer.alloc(PAYLOAD_BYTES)]),
    );
    // Consume the result so the compiler cannot dead-code-eliminate the call.
    if (dropped !== PAYLOAD_BYTES) {
      throw new Error('unexpected byte count');
    }
  }, {
    iterations: 20,
    throws: true,
    time: 2000,
    warmupIterations: 5,
  });
});
