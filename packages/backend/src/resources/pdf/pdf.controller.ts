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
import { PdfService } from './pdf.service.js';
import { PDF_MIME, PdfBuildSchema, type PdfBuildType, PdfExtractSchema, PdfMetadataSchema } from './schema.js';

/**
 * PDF routes. `/pdf/build` consumes JSON and bypasses the media
 * interceptors by design (JSON bodies are never virus-scanned or signature-probed);
 * `/pdf/extract` and `/pdf/metadata` take the binary upload and are ClamAV-scanned.
 */
@Controller('pdf')
export class PdfController {
  constructor(
    private readonly pdfService: PdfService,
    private readonly cls: NormalizedClsService,
  ) {}

  /**
   * Builds a PDF from the JSON payload (201).
   * @param response - Raw reply, streamed as application/pdf.
   * @param body - Pages, elements, embedded fonts and metadata.
   * @returns The document bytes (201).
   */
  @Post('build')
  async build(
    @Response({ passthrough: false }) response: FastifyReply,
    @Body({ pipes: [new StandardSchemaValidationPipe()], schema: PdfBuildSchema }) body: PdfBuildType,
  ) {
    const bytes = await this.pdfService.build(body);
    response.raw.setHeader('content-type', PDF_MIME);
    response.raw.setHeader('content-disposition', 'attachment; filename="export.pdf"');
    return pipeToReply(Readable.from([bytes]), response, createOutMeter(this.cls));
  }

  /**
   * Extracts text page by page (201).
   * @param _query - Empty query object; junk parameters are rejected with 400.
   * @returns The extracted metadata, page count and per-page text.
   */
  @Post('extract')
  @UseInterceptors(FileScannerInterceptor)
  // Bound only so the strict empty query schema rejects junk params; the value is unused.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  extract(@Query({ pipes: [new StandardSchemaValidationPipe()], schema: PdfExtractSchema }) _query: unknown) {
    return this.pdfService.extract();
  }

  /**
   * Normalized PDF metadata (201).
   * @param _query - Empty query object; junk parameters are rejected with 400.
   * @returns The metadata document.
   */
  @Post('metadata')
  @UseInterceptors(FileScannerInterceptor)
  // Bound only so the strict empty query schema rejects junk params; the value is unused.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  metadata(@Query({ pipes: [new StandardSchemaValidationPipe()], schema: PdfMetadataSchema }) _query: unknown) {
    return this.pdfService.metadata();
  }
}
