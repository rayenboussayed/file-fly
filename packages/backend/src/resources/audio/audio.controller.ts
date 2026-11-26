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

import { UseMediaPipeline } from '@/interceptors/pipeline.decorator.js';
import { createOutMeter } from '@/metrics/out-meter.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { OUTPUT_CONTENT_TYPE } from '@/utils/capabilities.js';

import { pipeToReply } from '../../utils/pipe.js';
import { AudioSignatureInterceptor } from './audio-signature.interceptor.js';
import { AudioService } from './audio.service.js';
import { AudioProcessorSchema, type AudioProcessorType } from './schema.js';

/**
Audio routes: processor, metadata, DNA and stats (binary stream endpoints).
 */
@Controller('audio')
@UseMediaPipeline(AudioSignatureInterceptor)
export class AudioController {
  constructor(
    private readonly audioService: AudioService,
    private readonly cls: NormalizedClsService,
  ) {}

  @Get('dna')
  async dnaGet() {
    return this.audioService.dna();
  }

  @Post('dna')
  async dnaPost() {
    return this.audioService.dna();
  }

  async main(
    response: FastifyReply,
    query: AudioProcessorType,
  ) {
    const processed = await this.audioService.processor({
      payload: query,
    });
    response.raw.setHeader('content-type', OUTPUT_CONTENT_TYPE[query.format as keyof typeof OUTPUT_CONTENT_TYPE] ?? 'application/octet-stream');
    return pipeToReply(processed, response, createOutMeter(this.cls));
  }

  @Get()
  async mainGet(
    @Response({ passthrough: false }) response: FastifyReply,
    @Query({ pipes: [new StandardSchemaValidationPipe()], schema: AudioProcessorSchema }) query: AudioProcessorType,
  ) {
    return this.main(response, query);
  }

  @Post()
  async mainPost(
    @Response({ passthrough: false }) response: FastifyReply,
    @Query({ pipes: [new StandardSchemaValidationPipe()], schema: AudioProcessorSchema }) query: AudioProcessorType,
  ) {
    return this.main(response, query);
  }

  @Get('metadata')
  async metadataGet() {
    return this.audioService.metadata();
  }

  @Post('metadata')
  async metadataPost() {
    return this.audioService.metadata();
  }

  @Get('stats')
  async statsGet() {
    return this.audioService.stats();
  }

  @Post('stats')
  async statsPost() {
    return this.audioService.stats();
  }
}