import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { FileTypeService } from '@/services/file-type.service.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { WorkerService } from '@/services/worker.service.js';

import { AudioController } from './audio.controller.js';
import { AudioSignatureInterceptor } from './audio-signature.interceptor.js';
import { AudioService } from './audio.service.js';

@Module({
  controllers: [AudioController],
  providers: [
    AudioService,
    FileTypeService,
    NormalizedClsService,
    WorkerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AudioSignatureInterceptor,
    },
  ],
})
export class AudioModule {}