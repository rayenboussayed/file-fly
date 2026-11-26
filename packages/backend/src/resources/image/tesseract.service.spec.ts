import { Buffer } from 'node:buffer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  mode: 'ok' as 'blocks-null' | 'ok' | 'recognize-fail' | 'reinit-fail',
}));

const BLOCKS_PAGE = {
  data: {
    blocks: [
      {
        paragraphs: [
          {
            lines: [
              { confidence: 87.5, text: 'hello\n' },
              { confidence: 66.25, text: 'world\n' },
            ],
          },
        ],
      },
    ],
    confidence: 87.5,
    text: 'hello world\n', // tesseract terminates the page text with a newline
  },
} as const;

vi.mock('tesseract.js', () => {
  const worker = {
    recognize: vi.fn(async () => {
      if (hoisted.mode === 'recognize-fail') throw new Error('native recognize exploded');
      return hoisted.mode === 'blocks-null' ? { data: { blocks: undefined, confidence: 12.5, text: 'nothing\n' } } : BLOCKS_PAGE;
    }),
    reinitialize: vi.fn(async () => {
      if (hoisted.mode === 'reinit-fail') throw new Error('reinitialize exploded');
    }),
    terminate: vi.fn(async () => {}),
  };
  return {
    createWorker: vi.fn(async () => worker),
    OEM: { LSTM_ONLY: 1 },
  };
});

import { TesseractService } from './tesseract.service.js';


describe('TesseractService', () => {
  type Pool = { slots: Array<{ busy: boolean }> };
  beforeEach(() => {
    hoisted.mode = 'ok';
  });

  it('recognizes text with a per-line breakdown', async () => {
    const service = new TesseractService();
    const result = await service.recognize(Buffer.from('img'), ['eng']);

    expect(result).toMatchObject({
      confidence: 87.5,
      langs: ['eng'],
      lines: [
        { confidence: 87.5, text: 'hello' },
        { confidence: 66.25, text: 'world' },
      ],
      text: 'hello world',
    });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    await service.onModuleDestroy();
  });

  it('returns an empty line breakdown when the page has no blocks', async () => {
    hoisted.mode = 'blocks-null';
    const service = new TesseractService();
    const result = await service.recognize(Buffer.from('img'), ['eng']);

    expect(result.lines).toEqual([]);
    expect(result.text).toBe('nothing');
    await service.onModuleDestroy();
  });

  it('retires the slot when recognition throws instead of returning it to the pool', async () => {
    const service = new TesseractService();
    hoisted.mode = 'recognize-fail';

    await expect(service.recognize(Buffer.from('img'), ['eng'])).rejects.toThrow('native recognize exploded');
    expect((service as unknown as Pool).slots).toHaveLength(0);

    hoisted.mode = 'ok';
    const result = await service.recognize(Buffer.from('img'), ['eng']);
    expect(result.text).toBe('hello world');
    await service.onModuleDestroy();
  });

  it('retires the slot when a reinitialize throws instead of wedging it busy forever', async () => {
    const service = new TesseractService();
    // Prime the pool with an idle eng slot.
    await service.recognize(Buffer.from('img'), ['eng']);
    expect((service as unknown as Pool).slots).toHaveLength(1);

    hoisted.mode = 'reinit-fail';
    await expect(service.recognize(Buffer.from('img'), ['fra'])).rejects.toThrow('reinitialize exploded');
    expect((service as unknown as Pool).slots).toHaveLength(0);
    await service.onModuleDestroy();
  });
});
