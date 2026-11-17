import { Readable } from 'node:stream';
import { bench, describe } from 'vitest';

import { bufferStream } from '@/utils/buffer.js';

/** Bytes per chunk fed to the stream (64 KiB, readableHighWaterMark-ish). */
const CHUNK_BYTES = 64 * 1024;

/** Number of chunks per simulated upload (2 MiB total). */
const CHUNKS = 32;

/**
 * Builds a fresh synthetic 2 MiB upload stream.
 * @returns A readable that yields 32 zero-filled 64 KiB chunks.
 */
function fakeUpload(): Readable {
  return Readable.from(
    Array.from({ length: CHUNKS }, () => Buffer.alloc(CHUNK_BYTES)),
  );
}

describe('bufferStream', () => {
  bench('buffers a 2 MiB upload', async () => {
    const buffered = await bufferStream(fakeUpload());
    // Consume the result so the compiler cannot dead-code-eliminate the call.
    if (buffered.length !== CHUNK_BYTES * CHUNKS) {
      throw new Error('unexpected buffer size');
    }
  }, {
    iterations: 20,
    // Deterministic: fail loudly instead of benching a broken path.
    throws: true,
    time: 2000,
    warmupIterations: 5,
  });
});
