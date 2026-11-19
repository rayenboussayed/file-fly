import { Module } from '@nestjs/common';

import { AntiVirusService } from '@/services/anti-virus.service.js';
import { FileTypeService } from '@/services/file-type.service.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { WorkerService } from '@/services/worker.service.js';

import { VideoController } from './video.controller.js';
import { VideoService } from './video.service.js';

/** Video feature module: processor, metadata, DNA, stats and screenshot routes. */
@Module({
  controllers: [VideoController],
  providers: [
    AntiVirusService,
    FileTypeService,
    NormalizedClsService,
    VideoService,
    WorkerService,
  ],
})
export class VideoModule {}
