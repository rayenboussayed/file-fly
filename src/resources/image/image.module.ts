import { Module } from '@nestjs/common';

import { AntiVirusService } from '@/services/anti-virus.service.js';
import { FileTypeService } from '@/services/file-type.service.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { WorkerService } from '@/services/worker.service.js';

import { ImageController } from './image.controller.js';
import { ImageService } from './image.service.js';
import { TesseractService } from './tesseract.service.js';

@Module({
  controllers: [ImageController],
  providers: [
    AntiVirusService,
    FileTypeService,
    ImageService,
    NormalizedClsService,
    TesseractService,
    WorkerService,
  ],
})
export class ImageModule {}
