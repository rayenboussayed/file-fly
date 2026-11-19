// eslint-disable-next-line n/no-extraneous-import
import type { FastifyReply } from 'fastify';

import {
  Body,
  Controller,
  Post,
  Query,
  Response,
  StandardSchemaValidationPipe,
  UseInterceptors,
} from '@nestjs/common';

import { FileScannerInterceptor } from '@/interceptors/file-scanner.interceptor.js';
import { createOutMeter } from '@/metrics/out-meter.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';

import { pipeToReply } from '../../utils/pipe.js';
import { CsvService } from './csv.service.js';
import {
  CsvBuildSchema,
  type CsvBuildType,
  CsvExtractSchema,
  type CsvExtractType,
  CsvMetadataSchema,
  type CsvMetadataType,
} from './schema.js';

/**
 * CSV routes. Unlike the media modules this controller binds interceptors
 * per route: `/csv/build` consumes a JSON body (the media parser never sees it),
 * while `/csv/extract` and `/csv/metadata` take the binary upload and are
 * ClamAV-scanned like any other binary payload.
 */
@Controller('csv')
export class CsvController {
  constructor(
    private readonly csvService: CsvService,
    private readonly cls: NormalizedClsService,
  ) {}

  /**
   * Serializes JSON rows to CSV. POST-only: there is no meaningful GET shape.
   * @param response - Raw reply, streamed with `text/csv`.
   * @param body - Rows and csv-stringify options.
   * @returns CSV bytes.
   */
  @Post('build')
  build(
    @Response({ passthrough: false }) response: FastifyReply,
    @Body({ pipes: [new StandardSchemaValidationPipe()], schema: CsvBuildSchema }) body: CsvBuildType,
  ) {
    response.raw.setHeader('content-type', 'text/csv; charset=utf-8');
    response.raw.setHeader('content-disposition', 'attachment; filename="export.csv"');
    return pipeToReply(this.csvService.buildCsv(body), response, createOutMeter(this.cls));
  }

  /**
   * Parses an uploaded CSV into typed JSON records.
   * @param query - Flat csv-parse options.
   * @returns The parsed records (201).
   */
  @Post('extract')
  @UseInterceptors(FileScannerInterceptor)
  extract(
    @Query({ pipes: [new StandardSchemaValidationPipe()], schema: CsvExtractSchema }) query: CsvExtractType,
  ) {
    return this.csvService.extract(query);
  }

  /**
   * Structural CSV metadata: rows, columns, delimiter, per-column type census.
   * @param query - Flat csv-parse options plus `maxRows` for the type census.
   * @returns The metadata document (201).
   */
  @Post('metadata')
  @UseInterceptors(FileScannerInterceptor)
  metadata(
    @Query({ pipes: [new StandardSchemaValidationPipe()], schema: CsvMetadataSchema }) query: CsvMetadataType,
  ) {
    return this.csvService.metadata(query);
  }
}
