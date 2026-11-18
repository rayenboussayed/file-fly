import fs from 'node:fs';
import { PassThrough } from 'node:stream';
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