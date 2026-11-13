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
import { screenshotBoundary } from './multipart.js';
import {
  parseFrames,
  ScreenshotSchema,
  type ScreenshotType,
  VideoProcessorSchema,
  type VideoProcessorType,
} from './schema.js';
import { VideoService } from './video.service.js';

@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

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
    query: VideoProcessorType,
  ) {
    const processed = await this.videoService.processor({
      payload: query,
    });
    response.raw.setHeader('content-type', OUTPUT_CONTENT_TYPE[query.format as keyof typeof OUTPUT_CONTENT_TYPE] ?? 'application/octet-stream');
    return pipeToReply(processed, response);
  }

  @Get()
  async mainGet(
    @Response({ passthrough: false }) response: FastifyReply,
    @Query({ pipes: [new StandardSchemaValidationPipe()], schema: VideoProcessorSchema }) query: VideoProcessorType,
  ) {
    return this.main(response, query);
  }

  @Post()
  async mainPost(
    @Response({ passthrough: false }) response: FastifyReply,
    @Query({ pipes: [new StandardSchemaValidationPipe()], schema: VideoProcessorSchema }) query: VideoProcessorType,
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

  async screenshot(
    response: FastifyReply,
    query: ScreenshotType,
  ) {
    const frames = parseFrames(query.frames);
    const boundary = screenshotBoundary(frames);
    response.raw.setHeader('content-type', `multipart/mixed; boundary="${boundary}"`);
    const processed = await this.videoService.screenshot({
      payload: query,
    });
    return pipeToReply(processed, response);
  }

  @Get('screenshot')
  async screenshotGet(
    @Response({ passthrough: false }) response: FastifyReply,
    @Query({ pipes: [new StandardSchemaValidationPipe()], schema: ScreenshotSchema }) query: ScreenshotType,
  ) {
    return this.screenshot(response, query);
  }

  @Post('screenshot')
  async screenshotPost(
    @Response({ passthrough: false }) response: FastifyReply,
    @Query({ pipes: [new StandardSchemaValidationPipe()], schema: ScreenshotSchema }) query: ScreenshotType,
  ) {
    return this.screenshot(response, query);
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
    return this.videoService.dna();
  }

  private async metadata() {
    return this.videoService.metadata();
  }

  private async stats() {
    return this.videoService.stats();
  }
}