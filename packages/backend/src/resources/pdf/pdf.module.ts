import { Module } from '@nestjs/common';

import { PdfController } from './pdf.controller.js';
import { PdfService } from './pdf.service.js';

/**
PDF feature module: build, extract and metadata routes.
 */
@Module({
  controllers: [PdfController],
  providers: [PdfService],
})
export class PdfModule {}
