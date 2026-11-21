// eslint-disable-next-line n/no-extraneous-import
import type { FastifyReply } from 'fastify';

import {
  Body,
  Controller,
  Post,
  Query,
  Response,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { Readable } from 'node:stream';

import { UseScanPipeline } from '@/interceptors/pipeline.decorator.js';
import { createOutMeter } from '@/metrics/out-meter.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';

import { pipeToReply } from '../../utils/pipe.js';
import { DocxService } from './docx.service.js';
import { DOCX_MIME, DocxBuildSchema, type DocxBuildType, DocxExtractSchema, DocxMetadataSchema } from './schema.js';

/**
 * DOCX routes. `/docx/build` consumes JSON and bypasses the media
 * interceptors by design (JSON bodies are never virus-scanned or signature-probed);
 * `/docx/extract` and `/docx/metadata` take the binary upload and are ClamAV-scanned.
 */
@Controller('docx')
export class DocxController {
  constructor(
    private readonly docxService: DocxService,
    private readonly cls: NormalizedClsService,
  ) {}

  /**
   * Builds a .docx from the JSON payload (201).
   * @param response - Raw reply, streamed as .docx.
   * @param body - Sections, blocks, metadata, numbering, notes, comments.
   * @returns The document bytes (201).
   */
  @Post('build')
  async build(
    @Response({ passthrough: false }) response: FastifyReply,
    @Body({ pipes: [new StandardSchemaValidationPipe()], schema: DocxBuildSchema }) body: DocxBuildType,
  ) {
    const bytes = await this.docxService.build(body);
    response.raw.setHeader('content-type', DOCX_MIME);
    response.raw.setHeader('content-disposition', 'attachment; filename="export.docx"');
    return pipeToReply(Readable.from([bytes]), response, createOutMeter(this.cls));
  }

  /**
   * Extracts text and structure from an uploaded .docx (201).
   * @param _query - Empty query object; junk parameters are rejected with 400.
   * @returns The extracted metadata, structure and body text.
   */
  @Post('extract')
  @UseScanPipeline()
  // Bound only so the strict empty query schema rejects junk params; the value is unused.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  extract(@Query({ pipes: [new StandardSchemaValidationPipe()], schema: DocxExtractSchema }) _query: unknown) {
    return this.docxService.extract();
  }

  /**
   * Normalized OOXML metadata for an uploaded .docx (201).
   * @param _query - Empty query object; junk parameters are rejected with 400.
   * @returns The metadata document.
   */
  @Post('metadata')
  @UseScanPipeline()
  // Bound only so the strict empty query schema rejects junk params; the value is unused.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  metadata(@Query({ pipes: [new StandardSchemaValidationPipe()], schema: DocxMetadataSchema }) _query: unknown) {
    return this.docxService.metadata();
  }
}
