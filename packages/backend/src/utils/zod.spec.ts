import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { EmptyQuerySchema, trimmed } from './zod.js';

describe('trimmed', () => {
  it('trims and validates', () => {
    expect(trimmed(z.string().min(2)).parse('  abc  ')).toBe('abc');
    expect(() => trimmed(z.string().min(2)).parse('  a  ')).toThrow();
  });
});

describe('EmptyQuerySchema', () => {
  it('accepts an empty object', () => {
    expect(EmptyQuerySchema.parse({})).toEqual({});
    expect(EmptyQuerySchema.safeParse({}).success).toBe(true);
  });

  it('rejects an unknown key', () => {
    expect(EmptyQuerySchema.safeParse({ foo: 1 }).success).toBe(false);
    expect(() => EmptyQuerySchema.parse({ foo: 1 })).toThrow();
  });
});