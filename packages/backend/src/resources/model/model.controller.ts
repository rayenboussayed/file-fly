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

import { UseScanPipeline } from '@/interceptors/pipeline.decorator.js';
import { createOutMeter } from '@/metrics/out-meter.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';

import { pipeToReply } from '../../utils/pipe.js';
import { ModelService } from './model.service.js';
import {
  MODEL_MIME,
  ModelConvertSchema,
  type ModelConvertType,
  ModelExtractSchema,
  ModelMetadataSchema,
  ModelOptimizeSchema,
  type ModelOptimizeType,
} from './schema.js';

/**
 * GLB routes. All routes take the binary upload and bypass the JSON parser by
 * design; they are ClamAV-scanned and GLB-signature gated (`glTF` magic).
 */
@Controller('model')
export class ModelController {
  constructor(
    private readonly modelService: ModelService,
    private readonly cls: NormalizedClsService,
  ) {}

  /**
   * Converts the uploaded GLB between container formats (201).
   * @param response - Raw reply, streamed as model/gltf-binary or model/gltf+json.
   * @param query - Target container (`glb` or self-contained `gltf`).
   * @returns The converted bytes (201).
   */
  @Post('convert')
  @UseScanPipeline()
  async convert(
    @Response({ passthrough: false }) response: FastifyReply,
    @Query({ pipes: [new StandardSchemaValidationPipe()], schema: ModelConvertSchema }) query: ModelConvertType,
  ) {
    const bytes = await this.modelService.convert(query);
    if (query.to === 'gltf') {
      response.raw.setHeader('content-type', 'model/gltf+json');
      response.raw.setHeader('content-disposition', 'attachment; filename="export.gltf"');
    } else {
      response.raw.setHeader('content-type', MODEL_MIME);
      response.raw.setHeader('content-disposition', 'attachment; filename="export.glb"');
    }
    return pipeToReply(Readable.from([bytes]), response, createOutMeter(this.cls));
  }

  /**
   * Extracts the scene graph, meshes, materials, textures, animations and skins (201).
   * @param _query - Empty query object; junk parameters are rejected with 400.
   * @returns The extraction document.
   */
  @Post('extract')
  @UseScanPipeline()
  // Bound only so the strict empty query schema rejects junk params; the value is unused.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  extract(@Query({ pipes: [new StandardSchemaValidationPipe()], schema: ModelExtractSchema }) _query: unknown) {
    return this.modelService.extract();
  }

  /**
   * Normalized GLB metadata (201).
   * @param _query - Empty query object; junk parameters are rejected with 400.
   * @returns The metadata document.
   */
  @Post('metadata')
  @UseScanPipeline()
  // Bound only so the strict empty query schema rejects junk params; the value is unused.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  metadata(@Query({ pipes: [new StandardSchemaValidationPipe()], schema: ModelMetadataSchema }) _query: unknown) {
    return this.modelService.metadata();
  }

  /**
   * Optimizes the uploaded model (dedup, prune, weld, optional simplify, optional meshopt/draco) (201).
   * @param response - Raw reply, streamed as model/gltf-binary.
   * @param query - Compression codec and simplification options.
   * @returns The optimized GLB bytes (201).
   */
  @Post('optimize')
  @UseScanPipeline()
  async optimize(
    @Response({ passthrough: false }) response: FastifyReply,
    @Query({ pipes: [new StandardSchemaValidationPipe()], schema: ModelOptimizeSchema }) query: ModelOptimizeType,
  ) {
    const bytes = await this.modelService.optimize(query);
    response.raw.setHeader('content-type', MODEL_MIME);
    response.raw.setHeader('content-disposition', 'attachment; filename="export.glb"');
    return pipeToReply(Readable.from([bytes]), response, createOutMeter(this.cls));
  }
}
