import { describe, expect, it } from 'vitest';

import { PptxBuildSchema } from './schema.js';

const parse = (chart: unknown) =>
  PptxBuildSchema.safeParse({ layout: 'LAYOUT_16x9', slides: [{ elements: [chart] }] });

describe('PptxBuildSchema scatter refinement', () => {
  const scatterSeries = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      labels: ['a', 'b'],
      name: `s${index}`,
      values: [1, 2],
    }));

  it('rejects a scatter chart with fewer than two series', () => {
    const result = parse({ chartType: 'scatter', series: scatterSeries(1), type: 'chart', x: 0, y: 0, w: 4, h: 3 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('scatter charts need at least two series (X and Y)');
    }
  });

  it('accepts a scatter chart with two series', () => {
    expect(parse({ chartType: 'scatter', series: scatterSeries(2), type: 'chart', x: 0, y: 0, w: 4, h: 3 }).success).toBe(true);
  });

  it('accepts a single-series bar chart', () => {
    expect(parse({ chartType: 'bar', series: scatterSeries(1), type: 'chart', x: 0, y: 0, w: 4, h: 3 }).success).toBe(true);
  });
});
