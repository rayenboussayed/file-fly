import {
  Controller,
  Get,
  Post,
  Query,
  StandardSchemaValidationPipe,
} from '@nestjs/common';

import { OcrService } from './ocr.service.js';
import { OcrSchema, type OcrType } from './schema.js';

@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  async main(
    query: OcrType,
  ) {
    return this.ocrService.ocr({
      payload: query,
    });
  }

  @Get()
  async mainGet(
    @Query({ pipes: [new StandardSchemaValidationPipe()], schema: OcrSchema }) query: OcrType,
  ) {
    return this.main(query);
  }

  @Post()
  async mainPost(
    @Query({ pipes: [new StandardSchemaValidationPipe()], schema: OcrSchema }) query: OcrType,
  ) {
    return this.main(query);
  }
}