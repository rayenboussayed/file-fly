import { PayloadTooLargeException } from '@nestjs/common';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';

import { bufferStream } from './buffer.js';

describe('bufferStream', () => {
  it('concatenates a small stream into a single Buffer', async () => {
    const result = await bufferStream(Readable.from([Buffer.from('hello '), 'world']));
    expect(result).toBeInstanceOf(Buffer);
    expect(result.equals(Buffer.from('hello world'))).toBe(true);
  });

  it('throws PayloadTooLargeException when exceeding a small maxBytes', async () => {
    await expect(bufferStream(Readable.from([Buffer.from('hello')]), 4)).rejects.toBeInstanceOf(
      PayloadTooLargeException,
    );
  });

  it('throws PayloadTooLargeException at the default 20 MiB cap', async () => {
    /**
     * Yields 21 one-MiB chunks to exceed the 20 MiB cap.
     * @yields A 1 MiB zero-filled chunk.
     */
    function* chunks(): Generator<Buffer> {
      for (let i = 0; i < 21; i += 1) {
        yield Buffer.alloc(1024 * 1024);
      }
    }
    await expect(bufferStream(Readable.from(chunks()))).rejects.toBeInstanceOf(PayloadTooLargeException);
  });
});
