import { describe, expect, it } from 'vitest';

import type { PdfBuildType } from '@/resources/pdf/schema.js';

import { buildPdfDocument } from '@/resources/pdf/builder.js';

import { settleHeap } from './helpers.js';

/**
Iterations in the measured loop; enough pressure to trip weak GC accounting.
 */
const ITERATIONS = 6;

/**
 * Realistic build payload: a title and 40 paragraphs in one page.
 * @returns A validated-shape build payload.
 */
const makePayload = (): PdfBuildType =>
  ({
    metadata: { author: 'file-fly', title: 'Memory Report' },
    pages: [
      {
        elements: [
          { size: 22, text: 'Memory Report', type: 'text', x: 72, y: 40 },
          ...Array.from({ length: 40 }, (_, index) => ({
            size: 10,
            text: `Paragraph ${index + 1}. The quick brown fox jumps over the lazy dog.`,
            type: 'text' as const,
            w: 468,
            x: 72,
            y: 100 + index * 10,
          })),
        ],
        size: 'a4',
      },
    ],
  }) as unknown as PdfBuildType;

describe('pdf build memory', () => {
  it('stays flat across repeated builds', async () => {
    // Warm up module/JIT state so it is not attributed to the leak.
    await buildPdfDocument(makePayload());
    await settleHeap();
    const before = process.memoryUsage();

    for (let index = 0; index < ITERATIONS; index += 1) {
      const bytes = await buildPdfDocument(makePayload());
      expect(bytes.length).toBeGreaterThan(1024);
    }

    await settleHeap();
    const after = process.memoryUsage();
    // Node's array buffers carry the PDF bytes and font artifacts; both are
    // freed when the caller drops them. Anything above these caps is a leak.
    expect(after.heapUsed - before.heapUsed).toBeLessThan(8 * 1024 * 1024);
    expect(after.arrayBuffers - before.arrayBuffers).toBeLessThan(8 * 1024 * 1024);
  }, 120_000);
});
