import {
  CallHandler,
  Injectable,
  NestInterceptor,
  UnsupportedMediaTypeException,
} from '@nestjs/common';

import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { FileTypeService } from '../../services/file-type.service.js';

@Injectable()
export class VideoSignatureInterceptor implements NestInterceptor {
  constructor(
    private readonly fileTypeService: FileTypeService,
    private readonly cls: NormalizedClsService,
  ) {}

  intercept(_: never, next: CallHandler) {
    const signature = this.cls.fileSignature().get();
    if (signature && !this.fileTypeService.isVideo(signature.mime)) {
      throw new UnsupportedMediaTypeException('File is not video');
    }
    return next.handle();
  }
}