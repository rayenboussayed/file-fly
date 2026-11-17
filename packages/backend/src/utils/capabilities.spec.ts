import { describe, expect, it } from 'vitest';

import { isAllowedOutputFormat, STREAMABLE_OUTPUT_FORMATS } from './capabilities.js';

describe('capabilities', () => {
  it('accepts all declared formats', () => {
    for (const format of STREAMABLE_OUTPUT_FORMATS)
      expect(isAllowedOutputFormat(format)).toBe(true);
  });

  it('rejects unsupported formats', () => {
    expect(isAllowedOutputFormat('wav')).toBe(false);
    expect(isAllowedOutputFormat(undefined)).toBe(false);
  });
});
