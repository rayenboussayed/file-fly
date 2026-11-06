// eslint-disable-next-line n/no-extraneous-import
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

import { VideoProcessorSchema, type VideoProcessorType } from './schema.js';
import { VideoService } from './video.service.js';

@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Get()
  @Post()
  async main(
    @Request() request: FastifyRequest,
    @Response({ passthrough: false }) response: FastifyReply,
    @Query({ schema: VideoProcessorSchema }) query: VideoProcessorType,
  ) {
    const processed = await this.videoService.processor({
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
    return this.videoService.metadata({ signal: request.signal });
  }

  private async stats(request: FastifyRequest) {
    return this.videoService.stats({ signal: request.signal });
  }
}