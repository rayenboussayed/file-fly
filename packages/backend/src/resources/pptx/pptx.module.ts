import { Module } from '@nestjs/common';

import { WorkerService } from '@/services/worker.service.js';

import { PptxController } from './pptx.controller.js';
import { PptxService } from './pptx.service.js';

/** PPTX feature module: build, extract and metadata routes. */
@Module({
  controllers: [PptxController],
  providers: [PptxService, WorkerService],
})
export class PptxModule {}
