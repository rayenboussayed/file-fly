import { PayloadTooLargeException, UnsupportedMediaTypeException } from '@nestjs/common';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';

import { loadPdq } from '@/utils/pdq.js';

import { ImageService } from './image.service.js';

const JPEG_PATH = 'assets/images/image-9.jpg';
const JPEG_SIGNATURE = { ext: '.jpg', mime: 'image/jpeg' };

/**
 * Opens a fresh readable stream over the JPEG fixture.
 * @returns A readable stream of the fixture bytes.
 */
function jpegStream(): Readable {
  return Readable.from([fs.readFileSync(JPEG_PATH)]);
}

/**
 * Builds an ImageService with stubbed dependencies for DNA tests.
 * @param signature - The file signature returned by the stubbed CLS store.
 * @param streamFactory - Factory opening a fresh input stream per call.
 * @param isImage - Whether the stubbed file-type check passes.
 * @returns An ImageService wired to the stubs.
 */
function makeService(signature: unknown, streamFactory: () => Readable, isImage = true): ImageService {
  const workerService = { createWorker: vi.fn() };
  const cls = {
    fileSignature: (): { get: () => unknown } => ({ get: () => signature }),
    sourceStream: (): { get: () => Readable } => ({ get: () => streamFactory() }),
  };
  const fileTypeService = { isImage: (): boolean => isImage };
  return new ImageService(workerService as never, cls as never, fileTypeService as never);
}

describe('ImageService.dna', () => {
  it('rejects a non-image signature', async () => {
    const service = makeService(JPEG_SIGNATURE, jpegStream, false);
    await expect(service.dna()).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it('rejects a missing signature', async () => {
    const service = makeService(undefined, jpegStream);
    await expect(service.dna()).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it('returns a well-formed PDQ fingerprint', async () => {
    const service = makeService(JPEG_SIGNATURE, jpegStream);
    const result = await service.dna();
    expect(result.algorithm).toBe('pdq');
    expect(result.version).toBe('pdq@1');
    expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(typeof result.quality).toBe('number');
    expect(result.quality).toBeGreaterThanOrEqual(0);
    expect(typeof result.env.pdqWasm).toBe('string');
    expect(result.env.pdqWasm.length).toBeGreaterThan(0);
    expect(typeof result.env.sharp).toBe('string');
    expect(result.env.sharp.length).toBeGreaterThan(0);
  });

  it('is deterministic across calls', async () => {
    const service = makeService(JPEG_SIGNATURE, jpegStream);
    const first = await service.dna();
    const second = await service.dna();
    expect(second.hash).toBe(first.hash);
  });

  it('stays close under JPEG quality-50 recompression', async () => {
    const original = fs.readFileSync(JPEG_PATH);
    const recompressed = await sharp(original).jpeg({ quality: 50 }).toBuffer();
    const hashA = (await makeService(JPEG_SIGNATURE, () => Readable.from([original])).dna()).hash;
    const hashB = (await makeService(JPEG_SIGNATURE, () => Readable.from([recompressed])).dna()).hash;
    const pdq = await loadPdq();
    expect(pdq.hammingDistance(pdq.fromHex(hashA), pdq.fromHex(hashB))).toBeLessThanOrEqual(31);
  });

  it('rejects oversize input before decoding', async () => {
    /**
     * Yields 21 one-MiB chunks to exceed the 20 MiB cap.
     * @yields A 1 MiB zero-filled chunk.
     */
    function* chunks(): Generator<Buffer> {
      for (let i = 0; i < 21; i += 1) {
        yield Buffer.alloc(1024 * 1024);
      }
    }
    const service = makeService(JPEG_SIGNATURE, () => Readable.from(chunks()));
    await expect(service.dna()).rejects.toBeInstanceOf(PayloadTooLargeException);
  });
});
