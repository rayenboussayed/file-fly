import { Module } from '@nestjs/common';

import { AntiVirusService } from '@/services/anti-virus.service.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { WorkerService } from '@/services/worker.service.js';

import { PptxController } from './pptx.controller.js';
import { PptxService } from './pptx.service.js';

/** PPTX feature module: build, extract and metadata routes. */
@Module({
  controllers: [PptxController],
  providers: [AntiVirusService, NormalizedClsService, PptxService, WorkerService],
})
export class PptxModule {}
