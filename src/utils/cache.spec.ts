import { describe, expect, it } from 'vitest';

import { generateCacheKey } from './cache.js';

describe('generateCacheKey', () => {
  it('returns deterministic hashes', () => {
    expect(generateCacheKey({ a: 1 })).toBe(generateCacheKey({ a: 1 }));
    expect(generateCacheKey({ a: 1 })).not.toBe(generateCacheKey({ a: 2 }));
  });
});