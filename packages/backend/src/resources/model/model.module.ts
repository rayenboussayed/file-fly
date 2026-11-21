import { Module } from '@nestjs/common';

import { WorkerService } from '@/services/worker.service.js';

import { ModelController } from './model.controller.js';
import { ModelService } from './model.service.js';

/** Model feature module: metadata, extract, optimize and convert routes. */
@Module({
  controllers: [ModelController],
  providers: [ModelService, WorkerService],
})
export class ModelModule {}
