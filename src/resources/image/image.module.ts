import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { FileTypeService } from '@/services/file-type.service.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { WorkerService } from '@/services/worker.service.js';

import { ImageSignatureInterceptor } from './image-signature.interceptor.js';
import { ImageController } from './image.controller.js';
import { ImageService } from './image.service.js';

@Module({
  controllers: [ImageController],
  providers: [
    FileTypeService,
    ImageService,
    NormalizedClsService,
    WorkerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ImageSignatureInterceptor,
    },
  ],
})
export class ImageModule {}
