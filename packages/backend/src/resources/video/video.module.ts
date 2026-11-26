import { Module } from '@nestjs/common';

import { WorkerService } from '@/services/worker.service.js';

import { VideoController } from './video.controller.js';
import { VideoService } from './video.service.js';

/**
Video feature module: processor, audio extraction, metadata, DNA, stats and screenshot routes.
 */
@Module({
  controllers: [VideoController],
  providers: [VideoService, WorkerService],
})
export class VideoModule {}
