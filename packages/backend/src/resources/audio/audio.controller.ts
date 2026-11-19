// eslint-disable-next-line n/no-extraneous-import
import type { FastifyReply } from 'fastify';

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
import { OUTPUT_CONTENT_TYPE } from '@/utils/capabilities.js';

import { pipeToReply } from '../../utils/pipe.js';
import { AudioSignatureInterceptor } from './audio-signature.interceptor.js';
import { AudioService } from './audio.service.js';
import { AudioProcessorSchema, type AudioProcessorType } from './schema.js';

/** Audio routes: processor, metadata, DNA and stats (binary stream endpoints). */
@Controller('audio')
@UseInterceptors(FileScannerInterceptor, FileParserInterceptor, AudioSignatureInterceptor)
export class AudioController {
  constructor(
    private readonly audioService: AudioService,
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