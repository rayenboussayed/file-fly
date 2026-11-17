import { bench, describe } from 'vitest';

import { loadPdq } from '@/utils/pdq.js';

/** Pixel dimensions of the synthetic benchmark image (smaller than real photos). */
const WIDTH = 64;
const HEIGHT = 64;

/**
 * Builds a deterministic 64x64 RGB test image (seeded diagonal gradient).
 * @returns The raw RGB pixel bytes.
 */
function diagonalGradient(): Uint8Array {
  const data = new Uint8Array(WIDTH * HEIGHT * 3);
  let seed = 0x1234_5678;
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      seed = (seed * 1_103_515_245 + 12_345) & 0x7fff_ffff;
      const base = (x * 4 + y * 2) % 256;
      const value = x === y ? 255 - base : (base + (seed % 64)) % 256;
      const i = (y * WIDTH + x) * 3;
      // eslint-disable-next-line security/detect-object-injection -- index is derived from bounded loop counters into a fixed-size buffer
      data[i] = value;
      data[i + 1] = (value + 37) % 256;
      data[i + 2] = (value + 101) % 256;
    }
  }
  return data;
}

// Load pdq-wasm once, up front: initialization (WASM compile + init) is not part
// of what these benchmarks measure.
const pdq = await loadPdq();
const image = diagonalGradient();

describe('PDQ hash', () => {
  bench('hashes a 64x64 RGB frame', () => {
    const { hash } = pdq.hash({ channels: 3, data: image, height: HEIGHT, width: WIDTH });
    // Consume the result so the compiler cannot dead-code-eliminate the call.
    if (hash.length !== 32) {
      throw new Error('unexpected PDQ hash length');
    }
  }, {
    iterations: 100,
    throws: true,
    time: 2000,
    warmupIterations: 5,
  });
});
