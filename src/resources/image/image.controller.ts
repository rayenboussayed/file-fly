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

import { ImageService } from './image.service.js';
import { ImageProcessorSchema, type ImageProcessorType } from './schema.js';

@Controller('image')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Get()
  @Post()
  async main(
    @Request() request: FastifyRequest,
    @Response({ passthrough: false }) response: FastifyReply,
    @Query({ schema: ImageProcessorSchema }) query: ImageProcessorType,
  ) {
    const processed = await this.imageService.processor({
      payload: query,
      signal: request.signal,
    });

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
    return this.imageService.metadata({ signal: request.signal });
  }

  private async stats(request: FastifyRequest) {
    return this.imageService.stats({ signal: request.signal });
  }
}