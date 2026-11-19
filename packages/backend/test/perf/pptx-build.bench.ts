import { bench, describe } from 'vitest';

import type { PptxBuildType } from '@/resources/pptx/schema.js';

import { buildPresentation } from '@/resources/pptx/elements.js';
import { PptxGenJs } from '@/resources/pptx/pptxgenjs.js';

/**
 * Realistic build payload: 24 slides with a title and body text each,
 * mirroring what `/pptx/build` accepts.
 * @returns A validated-shape build payload.
 */
const makePayload = (): PptxBuildType =>
  ({
    layout: 'LAYOUT_16x9',
    slides: Array.from({ length: 24 }, (_, index) => ({
      elements: [
        { h: 1, runs: [{ bold: true, text: `Slide ${index + 1}` }], type: 'text', w: 9, x: 0.5, y: 0.4 },
        { h: 3, runs: [{ text: 'The quick brown fox jumps over the lazy dog, packing glyphs.' }], type: 'text', w: 9, x: 0.5, y: 1.6 },
      ],
    })),
  }) as unknown as PptxBuildType;

describe('buildPresentation', () => {
  bench('builds a 24-slide deck', async () => {
    const bytes = await buildPresentation(new PptxGenJs(), makePayload());
    if (bytes.length < 1024) {
      throw new Error('pptx unexpectedly small');
    }
  }, {
    throws: true,
  });
});
