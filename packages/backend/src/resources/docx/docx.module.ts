import { Module } from '@nestjs/common';

import { AntiVirusService } from '@/services/anti-virus.service.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { WorkerService } from '@/services/worker.service.js';

import { DocxController } from './docx.controller.js';
import { DocxService } from './docx.service.js';

/** DOCX feature module: build, extract and metadata routes. */
@Module({
  controllers: [DocxController],
  providers: [AntiVirusService, DocxService, NormalizedClsService, WorkerService],
})
export class DocxModule {}
