import { Module } from '@nestjs/common';

import { WorkerService } from '@/services/worker.service.js';

import { AudioController } from './audio.controller.js';
import { AudioService } from './audio.service.js';

/**
Audio feature module: processor, metadata, DNA and stats routes.
 */
@Module({
  controllers: [AudioController],
  providers: [AudioService, WorkerService],
})
export class AudioModule {}
