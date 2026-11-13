import { describe, expect, it, vi } from 'vitest';

import { OcrController } from './ocr.controller.js';

describe('OcrController', () => {
  it('returns OCR result', async () => {
    const ocrService = { ocr: vi.fn(async () => ({ confidence: 90, text: 'ok' })) };
    const controller = new OcrController(ocrService as never);

    await expect(controller.main({ lang: 'eng' } as never)).resolves.toEqual({ confidence: 90, text: 'ok' });
    expect(ocrService.ocr).toHaveBeenCalledWith({ payload: { lang: 'eng' } });
  });

  it('delegates to GET and POST handlers', async () => {
    const ocrService = { ocr: vi.fn(async () => ({ confidence: 50, text: 'x' })) };
    const controller = new OcrController(ocrService as never);

    await expect(controller.mainGet({ lang: 'eng' } as never)).resolves.toEqual({ confidence: 50, text: 'x' });
    await expect(controller.mainPost({} as never)).resolves.toEqual({ confidence: 50, text: 'x' });
  });
});
