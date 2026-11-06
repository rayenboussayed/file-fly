import { ForbiddenException, Injectable } from '@nestjs/common';
import { fileTypeFromStream } from 'file-type';
import { Readable } from 'node:stream';

import { NormalizedClsService } from './normalized-cls.service.js';

@Injectable()
export class FileTypeService {
  constructor(private readonly normalizedCls: NormalizedClsService) {}

  isAudio(mime: string) {
    return mime.startsWith('audio/');
  }

  isImage(mime: string) {
    return mime.startsWith('image/');
  }

  isVideo(mime: string) {
    return mime.startsWith('video/');
  }

  async signature(options: { stream: Readable }) {
    const request = this.normalizedCls.request()
// eslint-disable-next-line n/no-unsupported-features/node-builtins
    const readableStream = Readable.toWeb(options.stream);
    try {
      const signature = await fileTypeFromStream(readableStream, {
        mpegOffsetTolerance: 10,
        signal: request.raw.signal,
      });

      if (!signature)
        throw new ForbiddenException('File signature could not be determined');

      this.normalizedCls.fileSignature().set(signature);
    } finally {
      await readableStream.cancel();
      options.stream.destroy();
    }
  }
}
