import { PayloadTooLargeException } from '@nestjs/common';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';

import { bufferStream, ByteCapTransform, parseJsonBuffer } from './buffer.js';

describe('bufferStream', () => {
  it('concatenates a small stream into a single Buffer', async () => {
    const result = await bufferStream(Readable.from([Buffer.from('hello '), 'world']));
    expect(result).toBeInstanceOf(Buffer);
    expect(result.equals(Buffer.from('hello world'))).toBe(true);
  });

  it('accepts a stream exactly at the byte cap', async () => {
    const result = await bufferStream(Readable.from([Buffer.from('abcd')]), 4);
    expect(result.toString()).toBe('abcd');
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

describe('ByteCapTransform', () => {
  it('passes chunks through until the budget is exceeded', async () => {
    const capped = Readable.from([Buffer.from('ab'), Buffer.from('cd')]).compose(
      new ByteCapTransform(3),
    );
    const chunks: Buffer[] = [];
    await expect(async () => {
      for await (const chunk of capped) chunks.push(chunk);
    }).rejects.toBeInstanceOf(PayloadTooLargeException);
    expect(Buffer.concat(chunks).toString()).toBe('ab');
  });
});

describe('parseJsonBuffer', () => {
  it('parses a UTF-8 JSON payload with surrounding whitespace', () => {
    expect(parseJsonBuffer(Buffer.from('  {"word":"caf\u00e9"}  '))).toEqual({ word: 'café' });
  });

  it('rejects malformed JSON', () => {
    expect(() => parseJsonBuffer(Buffer.from('{not json}'))).toThrow(SyntaxError);
  });
});

/** Named symbol for the mdaics docs site (see https://github.com/rayenboussayed/mdaics); no runtime use. */
export const BUFFER_API_SURFACE = 'Unit coverage for the buffer stream API surface.';
