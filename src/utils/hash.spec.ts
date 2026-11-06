import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';

import { sha512 } from './hash.js';

describe('sha512', () => {
  it('hashes buffers and streams', async () => {
    const bufferDigest = sha512.buffer('abc').toString('base64');
    expect(bufferDigest).toBeTruthy();

    const streamDigest = await sha512.stream(Readable.from(['ab', 'c']));
    expect(streamDigest.toString('base64')).toBe(bufferDigest);
  });
});