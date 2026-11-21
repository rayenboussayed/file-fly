import { Module } from '@nestjs/common';

import { WorkerService } from '@/services/worker.service.js';

import { DocxController } from './docx.controller.js';
import { DocxService } from './docx.service.js';

/** DOCX feature module: build, extract and metadata routes. */
@Module({
  controllers: [DocxController],
  providers: [DocxService, WorkerService],
})
export class DocxModule {}
