import { Buffer } from 'node:buffer';
import { describe, expect, it, vi } from 'vitest';

vi.mock('tesseract.js', () => {
  const worker = {
    recognize: vi.fn(async () => ({ data: { confidence: 87.5, text: 'hello' } })),
    reinitialize: vi.fn(async () => undefined),
    terminate: vi.fn(async () => undefined),
  };
  return {
    createWorker: vi.fn(async () => worker),
    OEM: { LSTM_ONLY: 1 },
  };
});

import { TesseractService } from './tesseract.service.js';

describe('TesseractService', () => {
  it('recognizes text and recycles after threshold', async () => {
    const service = new TesseractService();
    await service.onModuleInit();
    const result = await service.recognize(Buffer.from('img'), ['eng']);
    expect(result).toEqual({ confidence: 87.5, text: 'hello' });
    await service.onModuleDestroy();
  });
});