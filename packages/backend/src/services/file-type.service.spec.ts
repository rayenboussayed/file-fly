import fs from 'node:fs';
import { PassThrough } from 'node:stream';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';

import { FileTypeService } from './file-type.service.js';

describe('FileTypeService', () => {
  it('classifies mime types', () => {
    const service = new FileTypeService({ request: () => ({ raw: { signal: undefined } }) } as never);
    expect(service.isAudio('audio/mpeg')).toBe(true);
    expect(service.isImage('image/png')).toBe(true);
    expect(service.isVideo('video/mp4')).toBe(true);
    expect(service.isAudio('text/plain')).toBe(false);
    expect(service.isDocument('application/pdf')).toBe(true);
    expect(
      service.isDocument(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ).toBe(true);
    expect(
      service.isDocument(
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ),
    ).toBe(true);
    expect(service.isDocument('application/zip')).toBe(false);
    expect(
      service.isSpreadsheet(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ),
    ).toBe(true);
    expect(service.isSpreadsheet('application/pdf')).toBe(false);
    expect(service.isCsv('text/csv')).toBe(true);
    expect(service.isCsv('text/plain')).toBe(false);
  });

  it('reads and stores a signature', async () => {
    const chunks = [];
    const stream = new PassThrough();
    const cls = {
      fileSignature: () => ({ set: (v: unknown) => chunks.push(v) }),
      request: () => ({ raw: { signal: undefined } }),
    };
    const service = new FileTypeService(cls as never);
    stream.end(Buffer.from('not-an-image'));
    await expect(service.signature({ stream })).rejects.toBeTruthy();
  });

  it('stores a detected signature', async () => {
    const stream = fs.createReadStream('assets/images/image-0.jpg');
    const stored: unknown[] = [];
    const cls = {
      fileSignature: () => ({ set: (v: unknown) => stored.push(v) }),
      request: () => ({ raw: { signal: undefined } }),
    };
    const service = new FileTypeService(cls as never);
    await service.signature({ stream });
// eslint-disable-next-line sonarjs/prefer-specific-assertions
    expect(stored.length).toBe(1);
  });
});
describe('FileTypeService signature download paths', () => {
  it('consumes the whole probe branch to EOF once the signature is known', async () => {
    const cls = { fileSignature: () => ({ set: vi.fn() }) };
    const service = new FileTypeService(cls as never);

    const pngHeader = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
      'base64',
    );
    // Complete tiny PNG followed by 64 x 1 KB of trailing chunks.
    const chunks = [
      pngHeader,
      ...Array.from({ length: 64 }, () => Buffer.alloc(1024, 0xab)),
    ];
    let pulled = 0;
    /**
     * Replays the fixture chunks while counting them.
     * @yields The fixture chunks one at a time.
     */
    async function* counted() {
      for (const chunk of chunks) {
        pulled += 1;
        yield chunk;
      }
    }
    const source = Readable.from(counted());

    await service.signature({ stream: source });

    // The probe pump drains the rest of the stream in the background; wait for it.
    const deadline = Date.now() + 3_000;
    while (pulled < chunks.length && Date.now() < deadline) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    expect(pulled).toBe(chunks.length);
  });

  it('destroys the probe branch when the stream errors mid-read', async () => {
    const cls = { fileSignature: () => ({ set: vi.fn() }) };
    const service = new FileTypeService(cls as never);

    /**
     * Replays the fixture header, then fails mid-read.
     * @yields The fixture header, then throws.
     */
    async function* broken() {
      yield Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      throw new Error('connection reset');
    }
    const source = Readable.from(broken());

    await expect(service.signature({ stream: source })).rejects.toThrow();
    // The rejected upload is torn down on the service side.
    expect(source.destroyed).toBe(true);
  });
});

/** Named symbol for the mdaics docs site (see https://github.com/rayenboussayed/mdaics); no runtime use. */
export const FILE_TYPE_API_SURFACE = 'Unit coverage for the file-type service API surface.';
