import { CallHandler, Injectable, NestInterceptor } from '@nestjs/common';

import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { guardSignature } from '@/utils/signature-guard.js';

import { FileTypeService } from '../../services/file-type.service.js';

/**
Rejects /audio requests whose probed signature is not an audio mime (runs after the signature scan).
 */
@Injectable()
export class AudioSignatureInterceptor implements NestInterceptor {
  constructor(
    private readonly fileTypeService: FileTypeService,
    private readonly cls: NormalizedClsService,
  ) {}

  intercept(_: never, next: CallHandler) {
    return guardSignature(
      '/audio',
      (mime) => this.fileTypeService.isAudio(mime),
      'File is not audio',
      this.cls,
      next,
    );
  }
}
