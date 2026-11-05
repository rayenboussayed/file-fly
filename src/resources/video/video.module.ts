import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { FileTypeService } from '@/services/file-type.service.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { WorkerService } from '@/services/worker.service.js';

import { VideoController } from './video.controller.js';
import { VideoSignatureInterceptor } from './video-signature.interceptor.js';
import { VideoService } from './video.service.js';

@Module({
  controllers: [VideoController],
  providers: [
    FileTypeService,
    NormalizedClsService,
    VideoService,
    WorkerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: VideoSignatureInterceptor,
    },
  ],
})
export class VideoModule {}