import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  Controller,
  Get,
  Post,
  Query,
  Request,
  Response,
} from '@nestjs/common';
import { pipeline } from 'node:stream/promises';

import { AudioService } from './audio.service.js';
import { AudioProcessorSchema, type AudioProcessorType } from './schema.js';

@Controller('audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Get()
  @Post()
  async main(
    @Request() request: FastifyRequest,
    @Response({ passthrough: false }) response: FastifyReply,
    @Query({ schema: AudioProcessorSchema }) query: AudioProcessorType,
  ) {
    const processed = await this.audioService.processor({
      payload: query,
      signal: request.signal,
    });
    response.type('application/octet-stream');
    return pipeline(processed, response.raw, { signal: request.signal });
  }

  @Get('metadata')
  async metadataGet(@Request() request: FastifyRequest) {
    return this.metadata(request);
  }

  @Post('metadata')
  async metadataPost(@Request() request: FastifyRequest) {
    return this.metadata(request);
  }

  @Get('stats')
  async statsGet(@Request() request: FastifyRequest) {
    return this.stats(request);
  }

  @Post('stats')
  async statsPost(@Request() request: FastifyRequest) {
    return this.stats(request);
  }

  private async metadata(request: FastifyRequest) {
    return this.audioService.metadata({ signal: request.signal });
  }

  private async stats(request: FastifyRequest) {
    return this.audioService.stats({ signal: request.signal });
  }
}