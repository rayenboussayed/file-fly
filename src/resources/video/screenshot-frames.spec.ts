import { describe, expect, it } from 'vitest';

import { parseFrames } from './schema.js';

describe('parseFrames', () => {
  it('deduplicates, sorts, and caps at 50', () => {
    const raw = Array.from({ length: 60 }, (_, i) => i).join(',');
    const result = parseFrames(raw);
    expect(result).toHaveLength(50);
    expect(result[0]).toBe(0);
    expect(result[49]).toBe(49);
  });

  it('filters out-of-range and non-finite values', () => {
    expect(parseFrames('0,1.5,86400,999999')).toEqual([0, 1.5, 86400]);
  });

  it('returns empty for garbage', () => {
    expect(parseFrames('')).toEqual([]);
  });
});