import { Readable, Writable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import type { ImageOcrResult } from './type.js';

import { ImageController } from './image.controller.js';


/**
 * Creates a Writable raw sink with a `setHeader` mock for assertions.
 * @returns A writable with a mocked `setHeader`.
 */
function rawSink(): Writable & { setHeader: ReturnType<typeof vi.fn> } {
  const raw = new Writable({ write(_chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) { callback(); } });
  const setHeader = vi.fn();
  return Object.assign(raw, { setHeader }) as Writable & { setHeader: ReturnType<typeof vi.fn> };
}

describe('ImageController', () => {
  it('covers metadata, stats, and main', async () => {
    const processed = Readable.from([]);
    const imageService = {
      dna: vi.fn(async () => ({ dna: true })),
      metadata: vi.fn(async () => ({ ok: true })),
      processor: vi.fn(async () => processed),
      stats: vi.fn(async () => ({ stats: true })),
    };
    const cls = {
      fileSignature: () => ({ get: () => ({ mime: 'image/jpeg' }) }),
    };
    const controller = new ImageController(imageService as never, cls as never);
    const response = { raw: rawSink(), type: vi.fn() };

    await expect(controller.metadataGet()).resolves.toEqual({ ok: true });
    await expect(controller.metadataPost()).resolves.toEqual({ ok: true });
    await expect(controller.statsGet()).resolves.toEqual({ stats: true });
    await expect(controller.statsPost()).resolves.toEqual({ stats: true });
    await controller.main(response as never, {} as never);
    expect(imageService.processor).toHaveBeenCalled();

    await expect(controller.dnaGet()).resolves.toEqual({ dna: true });
    await expect(controller.dnaPost()).resolves.toEqual({ dna: true });

    const getResponse = { raw: rawSink(), type: vi.fn() };
    await controller.mainGet(getResponse as never, {} as never);
    await controller.mainPost(getResponse as never, {} as never);
    expect(imageService.processor).toHaveBeenCalledTimes(3);
  });

  it('delegates ocr to the service with the query payload', async () => {
    const ocrResult: ImageOcrResult = {
      confidence: 90,
      durationMs: 5,
      langs: ['eng'],
      lines: [{ confidence: 90, text: 'ok' }],
      text: 'ok',
    };
    const imageService = { ocr: vi.fn(async () => ocrResult) };
    const controller = new ImageController(imageService as never, {} as never);

    await expect(controller.ocrGet({ lang: 'eng' } as never)).resolves.toEqual(ocrResult);
    await expect(controller.ocrPost({} as never)).resolves.toEqual(ocrResult);
    expect(imageService.ocr).toHaveBeenCalledWith({ payload: { lang: 'eng' } });
    expect(imageService.ocr).toHaveBeenCalledWith({ payload: {} });
  });
});