import { Module } from '@nestjs/common';

import { AntiVirusService } from '@/services/anti-virus.service.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { WorkerService } from '@/services/worker.service.js';

import { ModelController } from './model.controller.js';
import { ModelService } from './model.service.js';

/** Model feature module: metadata, extract, optimize and convert routes. */
@Module({
  controllers: [ModelController],
  providers: [AntiVirusService, ModelService, NormalizedClsService, WorkerService],
})
export class ModelModule {}
