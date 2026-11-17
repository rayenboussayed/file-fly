import {
  CallHandler,
  Injectable,
  NestInterceptor,
  UnsupportedMediaTypeException,
} from '@nestjs/common';

import { NormalizedClsService } from '@/services/normalized-cls.service.js';

import { FileTypeService } from '../../services/file-type.service.js';

@Injectable()
export class AudioSignatureInterceptor implements NestInterceptor {
  constructor(
    private readonly fileTypeService: FileTypeService,
    private readonly cls: NormalizedClsService,
  ) {}

  intercept(_: never, next: CallHandler) {
    const request = this.cls.request();
    if (!request.url.startsWith('/audio')) return next.handle();
    const signature = this.cls.fileSignature().get();
    if (signature && !this.fileTypeService.isAudio(signature.mime)) {
      throw new UnsupportedMediaTypeException('File is not audio');
    }
    return next.handle();
  }
}