import { Module } from '@nestjs/common';

import { AntiVirusService } from '@/services/anti-virus.service.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';

import { CsvController } from './csv.controller.js';
import { CsvService } from './csv.service.js';

/** CSV feature module: build, extract and metadata routes. */
@Module({
  controllers: [CsvController],
  providers: [AntiVirusService, CsvService, NormalizedClsService],
})
export class CsvModule {}
