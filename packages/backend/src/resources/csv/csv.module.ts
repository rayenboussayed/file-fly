import { Module } from '@nestjs/common';

import { CsvController } from './csv.controller.js';
import { CsvService } from './csv.service.js';

/** CSV feature module: build, extract and metadata routes. */
@Module({
  controllers: [CsvController],
  providers: [CsvService],
})
export class CsvModule {}
