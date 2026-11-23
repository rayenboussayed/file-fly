import { CallHandler, Injectable, NestInterceptor } from '@nestjs/common';

import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { guardSignature } from '@/utils/signature-guard.js';

import { FileTypeService } from '../../services/file-type.service.js';

/** Rejects /image requests whose probed signature is not an image mime (runs after the signature scan). */
@Injectable()
export class ImageSignatureInterceptor implements NestInterceptor {
  constructor(
    private readonly fileTypeService: FileTypeService,
    private readonly cls: NormalizedClsService,
  ) {}

  intercept(_: never, next: CallHandler) {
    return guardSignature(
      '/image',
      (mime) => this.fileTypeService.isImage(mime),
      'File is not an image',
      this.cls,
      next,
    );
  }
}
