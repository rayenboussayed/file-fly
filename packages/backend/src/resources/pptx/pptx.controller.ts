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
import { PptxService } from './pptx.service.js';
import { PPTX_MIME, PptxBuildSchema, type PptxBuildType, PptxExtractSchema, PptxMetadataSchema } from './schema.js';

/**
 * PPTX routes. `/pptx/build` consumes JSON and bypasses the media
 * interceptors by design (JSON bodies are never virus-scanned or signature-probed);
 * `/pptx/extract` and `/pptx/metadata` take the binary upload and are ClamAV-scanned.
 */
@Controller('pptx')
export class PptxController {
  constructor(
    private readonly pptxService: PptxService,
    private readonly cls: NormalizedClsService,
  ) {}

  /**
   * Builds a .pptx from the JSON payload (201).
   * @param response - Raw reply, streamed as .pptx.
   * @param body - Slides, elements, theme and metadata.
   * @returns The document bytes (201).
   */
  @Post('build')
  async build(
    @Response({ passthrough: false }) response: FastifyReply,
    @Body({ pipes: [new StandardSchemaValidationPipe()], schema: PptxBuildSchema }) body: PptxBuildType,
  ) {
    const bytes = await this.pptxService.build(body);
    response.raw.setHeader('content-type', PPTX_MIME);
    response.raw.setHeader('content-disposition', 'attachment; filename="export.pptx"');
    return pipeToReply(Readable.from([bytes]), response, createOutMeter(this.cls));
  }

  /**
   * Extracts text and structure from an uploaded .pptx (201).
   * @param _query - Empty query object; junk parameters are rejected with 400.
   * @returns The extracted metadata, slide texts and notes.
   */
  @Post('extract')
  @UseInterceptors(FileScannerInterceptor)
  // Bound only so the strict empty query schema rejects junk params; the value is unused.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  extract(@Query({ pipes: [new StandardSchemaValidationPipe()], schema: PptxExtractSchema }) _query: unknown) {
    return this.pptxService.extract();
  }

  /**
   * Normalized OOXML metadata for an uploaded .pptx (201).
   * @param _query - Empty query object; junk parameters are rejected with 400.
   * @returns The metadata document.
   */
  @Post('metadata')
  @UseInterceptors(FileScannerInterceptor)
  // Bound only so the strict empty query schema rejects junk params; the value is unused.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  metadata(@Query({ pipes: [new StandardSchemaValidationPipe()], schema: PptxMetadataSchema }) _query: unknown) {
    return this.pptxService.metadata();
  }
}
