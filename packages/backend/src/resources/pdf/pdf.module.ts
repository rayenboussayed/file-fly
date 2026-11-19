import { Module } from '@nestjs/common';

import { AntiVirusService } from '@/services/anti-virus.service.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';

import { PdfController } from './pdf.controller.js';
import { PdfService } from './pdf.service.js';

/** PDF feature module: build, extract and metadata routes. */
@Module({
  controllers: [PdfController],
  providers: [AntiVirusService, NormalizedClsService, PdfService],
})
export class PdfModule {}
