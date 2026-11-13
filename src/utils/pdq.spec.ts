import { describe, expect, it } from 'vitest';

import { loadPdq } from './pdq.js';

/**
 * Builds a deterministic 64x64 RGB test image (seeded diagonal gradient).
 * @returns The raw RGB pixel bytes.
 */
function diagonalGradient(): Uint8Array {
  const width = 64;
  const height = 64;
  const data = new Uint8Array(width * height * 3);
  let seed = 0x12345678;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const base = (x * 4 + y * 2) % 256;
      const value = x === y ? 255 - base : (base + (seed % 64)) % 256;
      const i = (y * width + x) * 3;
      // eslint-disable-next-line security/detect-object-injection -- index is computed from bounded loop counters into a fixed-size buffer
      data[i] = value;
      data[i + 1] = (value + 37) % 256;
      data[i + 2] = (value + 101) % 256;
    }
  }
  return data;
}

describe('loadPdq', () => {
  it('exposes the PDQ hashing API', async () => {
    const pdq = await loadPdq();
    expect(typeof pdq.hash).toBe('function');
    expect(typeof pdq.toHex).toBe('function');
    expect(typeof pdq.fromHex).toBe('function');
    expect(typeof pdq.hammingDistance).toBe('function');
  });

  it('returns the same singleton on successive calls', async () => {
    await expect(loadPdq()).resolves.toBe(await loadPdq());
  });

  it('hashes a synthetic image deterministically to 32 bytes', async () => {
    const pdq = await loadPdq();
    const first = pdq.hash({ channels: 3, data: diagonalGradient(), height: 64, width: 64 });
    const second = pdq.hash({ channels: 3, data: diagonalGradient(), height: 64, width: 64 });
    expect(first.hash).toHaveLength(32);
    expect(Buffer.from(second.hash).equals(Buffer.from(first.hash))).toBe(true);
  });

  it('round-trips through toHex/fromHex', async () => {
    const pdq = await loadPdq();
    const { hash } = pdq.hash({ channels: 3, data: diagonalGradient(), height: 64, width: 64 });
    expect(Buffer.from(pdq.fromHex(pdq.toHex(hash))).equals(Buffer.from(hash))).toBe(true);
  });
});
