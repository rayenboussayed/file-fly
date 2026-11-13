// eslint-disable-next-line n/no-extraneous-import
import type { FastifyReply } from 'fastify';

import {
  Controller,
  Get,
  Post,
  Query,
  Response,
  StandardSchemaValidationPipe,
} from '@nestjs/common';

import { NormalizedClsService } from '@/services/normalized-cls.service.js';

import { pipeToReply } from '../../utils/pipe.js';
import { ImageService } from './image.service.js';
import { ImageProcessorSchema, type ImageProcessorType } from './schema.js';

/** Response content-type for each sharp output format this endpoint accepts. */
const SHARP_TO_MIME: Record<string, string> = {
  avif: 'image/avif',
  gif: 'image/gif',
  heif: 'image/heif',
  jp2: 'image/jp2',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  tiff: 'image/tiff',
  webp: 'image/webp',
};

@Controller('image')
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

     
    const output = query.format ? SHARP_TO_MIME[query.format] : undefined;
    response.raw.setHeader('content-type', output ?? this.cls.fileSignature().get()?.mime ?? 'application/octet-stream');
    return pipeToReply(processed, response);
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
    @Response({ passthrough: false }) response: FastifyReply,
  ) {
    return this.ocr(response);
  }

  @Post('ocr')
  async ocrPost(
    @Response({ passthrough: false }) response: FastifyReply,
  ) {
    return this.ocr(response);
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

  private async ocr(response: FastifyReply) {
    const processed = await this.imageService.ocr();
    response.raw.setHeader('content-type', 'image/png');
    return pipeToReply(processed, response);
  }

  private async stats() {
    return this.imageService.stats();
  }
}