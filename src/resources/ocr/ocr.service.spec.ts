import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import { OcrService } from './ocr.service.js';

describe('OcrService', () => {
  it('validates image mime and buffers with cap', async () => {
    const tesseract = { recognize: vi.fn(async () => ({ confidence: 99.1, text: 'hi' })) };
    const cls = {
      fileSignature: () => ({ get: () => ({ mime: 'image/png' }) }),
      sourceStream: () => ({ get: () => Readable.from([Buffer.from('abc')]) }),
    };
    const fileTypeService = { isImage: () => true };
    const service = new OcrService(tesseract as never, cls as never, fileTypeService as never);

    await expect(service.ocr({ payload: {} })).resolves.toEqual({ confidence: 99.1, text: 'hi' });
    expect(tesseract.recognize).toHaveBeenCalledWith(Buffer.from('abc'), ['eng']);
  });

  it('parses and normalizes languages', () => {
    const service = new OcrService({} as never, {} as never, {} as never);
    expect(service.parseLangs(undefined)).toEqual(['eng']);
    expect(service.parseLangs('eng+fra+eng+deu+spa')).toEqual(['deu', 'eng', 'fra', 'spa']);
    expect(service.parseLangs('  +  ')).toEqual(['eng']);
  });
});