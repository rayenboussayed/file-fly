import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { trimmed } from './zod.js';

describe('trimmed', () => {
  it('trims and validates', () => {
    expect(trimmed(z.string().min(2)).parse('  abc  ')).toBe('abc');
    expect(() => trimmed(z.string().min(2)).parse('  a  ')).toThrow();
  });
});