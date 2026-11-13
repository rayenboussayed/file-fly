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

import { OUTPUT_CONTENT_TYPE } from '@/utils/capabilities.js';

import { pipeToReply } from '../../utils/pipe.js';
import { AudioService } from './audio.service.js';
import { AudioProcessorSchema, type AudioProcessorType } from './schema.js';

@Controller('audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

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
    query: AudioProcessorType,
  ) {
    const processed = await this.audioService.processor({
      payload: query,
    });
    response.raw.setHeader('content-type', OUTPUT_CONTENT_TYPE[query.format as keyof typeof OUTPUT_CONTENT_TYPE] ?? 'application/octet-stream');
    return pipeToReply(processed, response);
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
    return this.metadata();
  }

  @Post('metadata')
  async metadataPost() {
    return this.metadata();
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
    return this.audioService.dna();
  }

  private async metadata() {
    return this.audioService.metadata();
  }

  private async stats() {
    return this.audioService.stats();
  }
}