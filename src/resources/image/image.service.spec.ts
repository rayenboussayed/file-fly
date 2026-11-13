import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import { ImageService } from './image.service.js';

describe('ImageService', () => {
  it('covers metadata, processor, stats, and ocr', async () => {
    const workerService = {
      createWorker: vi.fn(async () => Readable.from([JSON.stringify({ width: 1 })])),
    };
    const cls = { fileSignature: () => ({ get: () => ({ mime: 'image/png' }) }) };
    const fileTypeService = { isImage: () => true };
    const service = new ImageService(workerService as never, cls as never, fileTypeService as never);

    await expect(service.metadata()).resolves.toEqual({ width: 1 });
    const processor = await service.processor({ payload: { width: 2 } as never });
    expect(processor).toBeDefined();
    await expect(service.stats()).resolves.toEqual({ width: 1 });
    const ocr = await service.ocr();
    expect(ocr).toBeDefined();
  });
});