import { UnsupportedMediaTypeException } from '@nestjs/common';
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import type { ImageOcrResult } from './type.js';

import { ImageService } from './image.service.js';

/**
1x1 white PNG, decodes with the production preprocess pipeline.
 */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
  'base64',
);

const OCR_RESULT: ImageOcrResult = {
  confidence: 87.5,
  durationMs: 3,
  langs: ['eng'],
  lines: [{ confidence: 87.5, text: 'hello' }],
  text: 'hello',
};

/**
 * Builds an ImageService with stubbed dependencies.
 * @param signature - File signature returned by the stubbed CLS store.
 * @param source - Factory opening a fresh input stream per call.
 * @param isImage - Whether the stubbed file-type check passes.
 * @returns The service plus captured recognize calls for assertions.
 */
function makeService(
  signature: unknown,
  source: () => Readable = () => Readable.from([TINY_PNG]),
  isImage = true,
) {
  const workerService = {
    createWorker: vi.fn(async () => Readable.from([JSON.stringify({ width: 1 })])),
  };
  const cls = {
    fileSignature: (): { get: () => unknown } => ({ get: () => signature }),
    sourceStream: (): { get: () => Readable } => ({ get: () => source() }),
  };
  const fileTypeService = { isImage: (): boolean => isImage };
  const recognizeCalls: Array<[Buffer, string[]]> = [];
  const tesseract = {
    recognize: vi.fn(async (buffer: Buffer, langs: string[]) => {
      recognizeCalls.push([buffer, langs]);
      return OCR_RESULT;
    }),
  };
  const service = new ImageService(
    cls as never,
    fileTypeService as never,
    tesseract as never,
    workerService as never,
  );
  return { recognizeCalls, service, workerService };
}

const PNG_SIGNATURE = { ext: '.png', mime: 'image/png' };

describe('ImageService', () => {
  it('covers metadata, processor, and stats', async () => {
    const { service } = makeService(PNG_SIGNATURE);

    await expect(service.metadata()).resolves.toEqual({ width: 1 });
    const processor = await service.processor({ payload: { width: 2 } as never });
    expect(processor).toBeDefined();
    await expect(service.stats()).resolves.toEqual({ width: 1 });
  });

  it('rejects a non-image signature for ocr', async () => {
    const { service } = makeService(PNG_SIGNATURE, undefined, false);
    await expect(service.ocr({ payload: {} })).rejects.toThrow('Unsupported image input');
  });

  it('rejects a missing signature for ocr', async () => {
    const { service } = makeService(undefined);
    await expect(service.ocr({ payload: {} })).rejects.toThrow('Unsupported image input');
  });

  it('rejects a non-decodable image with 415', async () => {
    const { service } = makeService(PNG_SIGNATURE, () => Readable.from([Buffer.from('definitely not a png')]));

    const failure = service.ocr({ payload: {} });
    await expect(failure).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
    await expect(failure).rejects.toThrow('Image could not be decoded');
  });

  it('recognizes text on a preprocessed buffer', async () => {
    const { recognizeCalls, service } = makeService(PNG_SIGNATURE);

    await expect(
      service.ocr({ payload: { lang: 'ENG+fra' } }),
    ).resolves.toEqual(OCR_RESULT);
    expect(recognizeCalls).toHaveLength(1);
    const [buffer, langs] = recognizeCalls[0]!;
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(1, 4).toString()).toBe('PNG');
    expect(langs).toEqual(['eng', 'fra']);
  });

  it.each([
    [undefined, ['eng']],
    ['eng+fra+ENG+deu+spa', ['deu', 'eng', 'fra', 'spa']],
    ['eng,fra', ['eng', 'fra']],
    ['  +  ', ['eng']],
    ['eng+fra+deu+spa+ita', ['deu', 'eng', 'fra', 'ita']],
  ])('normalizes lang %s to %o', async (lang, expected) => {
    const { recognizeCalls, service } = makeService(PNG_SIGNATURE);

    await service.ocr({ payload: { lang } });
    expect(recognizeCalls[0]![1]).toEqual(expected);
  });
});

describe('ImageService signature gate', () => {
  it('rejects with 415 when the signature is missing or not an image', async () => {
    const workerService = { createWorker: vi.fn() };
    const missing = new ImageService(
      { fileSignature: () => ({ get: () => {} }) } as never,
      { isImage: () => true } as never,
      {} as never,
      workerService as never,
    );
    await expect(missing.processor({ payload: {} as never })).rejects.toMatchObject({ status: 415 });

    const notImage = new ImageService(
      { fileSignature: () => ({ get: () => ({ ext: 'pdf', mime: 'application/pdf' }) }) } as never,
      { isImage: () => false } as never,
      {} as never,
      workerService as never,
    );
    await expect(notImage.processor({ payload: {} as never })).rejects.toMatchObject({ status: 415 });
  });
});
