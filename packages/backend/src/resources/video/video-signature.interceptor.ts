import { CallHandler, Injectable, NestInterceptor } from '@nestjs/common';

import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { guardSignature } from '@/utils/signature-guard.js';

import { FileTypeService } from '../../services/file-type.service.js';

/**
Rejects /video requests whose probed signature is not a video mime (runs after the signature scan).
 */
@Injectable()
export class VideoSignatureInterceptor implements NestInterceptor {
  constructor(
    private readonly fileTypeService: FileTypeService,
    private readonly cls: NormalizedClsService,
  ) {}

  intercept(_: never, next: CallHandler) {
    return guardSignature(
      '/video',
      (mime) => this.fileTypeService.isVideo(mime),
      'File is not video',
      this.cls,
      next,
    );
  }
}
