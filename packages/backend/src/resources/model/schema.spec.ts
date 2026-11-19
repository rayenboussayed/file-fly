import { describe, expect, it } from 'vitest';

import { ModelOptimizeSchema } from './schema.js';

describe('ModelOptimizeSchema', () => {
  it('applies the meshopt + weld defaults', () => {
    const parsed = ModelOptimizeSchema.parse({});
    expect(parsed).toEqual({ compress: 'meshopt', simplify: 1, weld: true });
  });

  it('parses decimal simplify strings including fractions', () => {
    expect(ModelOptimizeSchema.parse({ simplify: '0.5' }).simplify).toBe(0.5);
    expect(ModelOptimizeSchema.parse({ simplify: '0' }).simplify).toBe(0);
    expect(ModelOptimizeSchema.parse({ simplify: '1.0' }).simplify).toBe(1);
  });

  it('rejects blank, exponent and out-of-range simplify values', () => {
    for (const simplify of ['', '  ', '1e-3', '2', '-0.5', 'abc', 'NaN']) {
      expect(ModelOptimizeSchema.safeParse({ simplify }).success).toBe(false);
    }
  });

  it('accepts the house boolean spellings', () => {
    expect(ModelOptimizeSchema.parse({ weld: 'false' }).weld).toBe(false);
    expect(ModelOptimizeSchema.parse({ weld: '0' }).weld).toBe(false);
    expect(ModelOptimizeSchema.parse({ weld: 'yes' }).weld).toBe(true);
    expect(ModelOptimizeSchema.parse({ weld: 'off' }).weld).toBe(false);
    expect(ModelOptimizeSchema.safeParse({ weld: 'junk' }).success).toBe(false);
  });

  it('rejects unknown query parameters', () => {
    expect(ModelOptimizeSchema.safeParse({ bogus: 1, compress: 'meshopt' }).success).toBe(false);
  });
});
