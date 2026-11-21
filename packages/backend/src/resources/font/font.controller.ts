// eslint-disable-next-line n/no-extraneous-import
import type { FastifyReply } from 'fastify';

import {
  Controller,
  Post,
  Query,
  Response,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { Readable } from 'node:stream';

import { HEADER_X_FONT_SUBSET } from '@/constants/header.js';
import { UseScanPipeline } from '@/interceptors/pipeline.decorator.js';
import { createOutMeter } from '@/metrics/out-meter.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';

import { pipeToReply } from '../../utils/pipe.js';
import { FontService } from './font.service.js';
import {
  FontExtractSchema,
  type FontExtractType,
  FontMetaSchema,
  type FontMetaType,
  FontShapeSchema,
  type FontShapeType,
  FontSubsetSchema,
  type FontSubsetType,
} from './schema.js';

/**
 * Font routes. All routes take the binary upload and bypass the JSON parser by
 * design; they are ClamAV-scanned and font-signature gated (TTF/OTF/WOFF/WOFF2/TTC).
 */
@Controller('font')
export class FontController {
  constructor(
    private readonly fontService: FontService,
    private readonly cls: NormalizedClsService,
  ) {}

  /**
   * Extracts the font's coverage and glyph inventory (201).
   * @param query - Optional collection member.
   * @returns The extraction document.
   */
  @Post('extract')
  @UseScanPipeline()
  extract(
    @Query({ pipes: [new StandardSchemaValidationPipe()], schema: FontExtractSchema }) query: FontExtractType,
  ) {
    return this.fontService.extract(query);
  }

  /**
   * Normalized font metadata (201).
   * @param query - Optional collection member.
   * @returns The metadata document.
   */
  @Post('metadata')
  @UseScanPipeline()
  metadata(
    @Query({ pipes: [new StandardSchemaValidationPipe()], schema: FontMetaSchema }) query: FontMetaType,
  ) {
    return this.fontService.metadata(query);
  }

  /**
   * Shapes text with the font's OpenType engine (201).
   * @param query - Text plus optional script/language/direction/features.
   * @returns The shaped glyph run.
   */
  @Post('shape')
  @UseScanPipeline()
  shape(
    @Query({ pipes: [new StandardSchemaValidationPipe()], schema: FontShapeSchema }) query: FontShapeType,
  ) {
    return this.fontService.shape(query);
  }

  /**
   * Subsets the font to the glyphs needed for the given text (201).
   * The output is a minimal sfnt for PDF embedding (no cmap); it is not a web font.
   * @param response - Raw reply, streamed as font/ttf.
   * @param query - The text to include.
   * @returns The subsetted font bytes (201).
   */
  @Post('subset')
  @UseScanPipeline()
  async subset(
    @Response({ passthrough: false }) response: FastifyReply,
    @Query({ pipes: [new StandardSchemaValidationPipe()], schema: FontSubsetSchema }) query: FontSubsetType,
  ) {
    const bytes = await this.fontService.subset(query);
    response.raw.setHeader('content-type', 'font/ttf');
    response.raw.setHeader('content-disposition', 'attachment; filename="subset.ttf"');
    response.raw.setHeader(HEADER_X_FONT_SUBSET, 'pdf-embed');
    return pipeToReply(Readable.from([bytes]), response, createOutMeter(this.cls));
  }
}
