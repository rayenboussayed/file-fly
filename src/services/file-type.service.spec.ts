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
});