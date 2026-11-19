// eslint-disable-next-line n/no-extraneous-import
import type { FastifyReply } from 'fastify';
import type { FormatEnum } from 'sharp';

import {
  Controller,
  Get,
  Post,
  Query,
  Response,
  StandardSchemaValidationPipe,
  UseInterceptors,
} from '@nestjs/common';

import { FileParserInterceptor } from '@/interceptors/file-parser.interceptor.js';
import { FileScannerInterceptor } from '@/interceptors/file-scanner.interceptor.js';
import { createOutMeter } from '@/metrics/out-meter.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';

import { pipeToReply } from '../../utils/pipe.js';
import { ImageSignatureInterceptor } from './image-signature.interceptor.js';
import { ImageService } from './image.service.js';
import { ImageProcessorSchema, type ImageProcessorType, OcrSchema, type OcrType } from './schema.js';

/**
 * Response content-type per sharp-encodable format. `avif`/`jpg` are not
 * encoder keys; formats absent from this map fall back to octet-stream.
 */
const SHARP_TO_MIME: Partial<Record<keyof FormatEnum, string>> = {
  gif: 'image/gif',
  heif: 'image/heif',
  jp2: 'image/jp2',
  jpeg: 'image/jpeg',
  jxl: 'image/jxl',
  png: 'image/png',
  ppm: 'image/x-portable-pixmap',
  svg: 'image/svg+xml',
  tiff: 'image/tiff',
  webp: 'image/webp',
};

/** Image routes: processor, metadata, DNA, stats and OCR (binary stream endpoints). */
@Controller('image')
@UseInterceptors(FileScannerInterceptor, FileParserInterceptor, ImageSignatureInterceptor)
export class ImageController {
  constructor(
    private readonly imageService: ImageService,
    private readonly cls: NormalizedClsService,
  ) {}

  @Get('dna')
  async dnaGet() {
    return this.dna();
  }

  @Post('dna')
  async dnaPost() {
    return this.dna();
  }

  async main(
    response: FastifyReply,
    query: ImageProcessorType,
  ) {
    const processed = await this.imageService.processor({
      payload: query,
    });

    // If a format was requested, serve the map's mime; for unknown formats fall
    // back to octet-stream rather than wrongly labelling bytes with the input's mime.
    const output = query.format ? (SHARP_TO_MIME[query.format] ?? 'application/octet-stream') : this.cls.fileSignature().get()?.mime;
    response.raw.setHeader('content-type', output ?? 'application/octet-stream');
    return pipeToReply(processed, response, createOutMeter(this.cls));
  }

  @Get()
  async mainGet(
    @Response({ passthrough: false }) response: FastifyReply,
    @Query({ pipes: [new StandardSchemaValidationPipe()], schema: ImageProcessorSchema }) query: ImageProcessorType,
  ) {
    return this.main(response, query);
  }

  @Post()
  async mainPost(
    @Response({ passthrough: false }) response: FastifyReply,
    @Query({ pipes: [new StandardSchemaValidationPipe()], schema: ImageProcessorSchema }) query: ImageProcessorType,
  ) {
    return this.main(response, query);
  }

  @Get('metadata')
  async metadataGet() {
    return this.metadata();
  }

  @Post('metadata')
  async metadataPost() {
    return this.metadata();
  }

  @Get('ocr')
  async ocrGet(
    @Query({ pipes: [new StandardSchemaValidationPipe()], schema: OcrSchema }) query: OcrType,
  ) {
    return this.ocr(query);
  }

  @Post('ocr')
  async ocrPost(
    @Query({ pipes: [new StandardSchemaValidationPipe()], schema: OcrSchema }) query: OcrType,
  ) {
    return this.ocr(query);
  }

  @Get('stats')
  async statsGet() {
    return this.stats();
  }

  @Post('stats')
  async statsPost() {
    return this.stats();
  }

  private async dna() {
    return this.imageService.dna();
  }

  private async metadata() {
    return this.imageService.metadata();
  }

  private async ocr(query: OcrType) {
    return this.imageService.ocr({ payload: query });
  }

  private async stats() {
    return this.imageService.stats();
  }
}