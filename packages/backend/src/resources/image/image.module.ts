import { Module } from '@nestjs/common';

import { WorkerService } from '@/services/worker.service.js';

import { ImageController } from './image.controller.js';
import { ImageService } from './image.service.js';
import { TesseractService } from './tesseract.service.js';

/**
Image feature module: processor, metadata, DNA, stats and OCR routes.
 */
@Module({
  controllers: [ImageController],
  providers: [ImageService, TesseractService, WorkerService],
})
export class ImageModule {}
