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
import { Readable } from 'node:stream';

import { FileScannerInterceptor } from '@/interceptors/file-scanner.interceptor.js';
import { createOutMeter } from '@/metrics/out-meter.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';

import { pipeToReply } from '../../utils/pipe.js';
import {
  XlsxBuildSchema,
  type XlsxBuildType,
  XlsxExtractSchema,
  type XlsxExtractType,
  XlsxMetadataSchema,
  type XlsxMetadataType,
} from './schema.js';
import { XlsxService } from './xlsx.service.js';

const SPREADSHEET_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Spreadsheet routes. `/xlsx/build` consumes JSON (no media interceptors);
 * `/xlsx/extract` and `/xlsx/metadata` take the binary upload and are
 * ClamAV-scanned like any other binary payload.
 */
@Controller('xlsx')
export class XlsxController {
  constructor(
    private readonly xlsxService: XlsxService,
    private readonly cls: NormalizedClsService,
  ) {}

  /**
   * Builds a workbook from JSON rows and cell objects.
   * @param response - Raw reply, streamed as `.xlsx`.
   * @param body - Sheets, workbook properties, defined names.
   * @returns The workbook bytes (201).
   */
  @Post('build')
  async build(
    @Response({ passthrough: false }) response: FastifyReply,
    @Body({ pipes: [new StandardSchemaValidationPipe()], schema: XlsxBuildSchema }) body: XlsxBuildType,
  ) {
    const bytes = await this.xlsxService.build(body);
    response.raw.setHeader('content-type', SPREADSHEET_MIME);
    response.raw.setHeader('content-disposition', 'attachment; filename="export.xlsx"');
    return pipeToReply(Readable.from([bytes]), response, createOutMeter(this.cls));
  }

  /**
   * Extracts one sheet as typed JSON.
   * @param query - Flat reader options.
   * @returns `{ sheet, records }` (201).
   */
  @Post('extract')
  @UseInterceptors(FileScannerInterceptor)
  extract(
    @Query({ pipes: [new StandardSchemaValidationPipe()], schema: XlsxExtractSchema }) query: XlsxExtractType,
  ) {
    return this.xlsxService.extract(query);
  }

  /**
   * Structural workbook metadata: dims, counts, props, names, formula inventory, cell census.
   * @param query - Flat metadata options.
   * @returns The metadata document (201).
   */
  @Post('metadata')
  @UseInterceptors(FileScannerInterceptor)
  metadata(
    @Query({ pipes: [new StandardSchemaValidationPipe()], schema: XlsxMetadataSchema }) query: XlsxMetadataType,
  ) {
    return this.xlsxService.metadata(query);
  }
}
