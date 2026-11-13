import { Module } from '@nestjs/common';

import { FileTypeService } from '@/services/file-type.service.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';

import { OcrController } from './ocr.controller.js';
import { OcrService } from './ocr.service.js';
import { TesseractService } from './tesseract.service.js';

@Module({
  controllers: [OcrController],
  providers: [FileTypeService, NormalizedClsService, OcrService, TesseractService],
})
export class OcrModule {}
