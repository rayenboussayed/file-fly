import type { Readable } from 'node:stream';

import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';

import { FileTypeService } from '@/services/file-type.service.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { workerPath, WorkerService } from '@/services/worker.service.js';
import { readWorkerJson } from '@/utils/buffer.js';
import { toDemuxerFormat } from '@/utils/input-format.js';

import type { VideoProcessorType } from './schema.js';

import { parseFrames, type ScreenshotType } from './schema.js';

/** Video feature service: streams uploads through workers for processing, metadata, DNA fingerprinting, stats and screenshots. */
@Injectable()
export class VideoService {
  constructor(
    private readonly workerService: WorkerService,
    private readonly cls: NormalizedClsService,
    private readonly fileTypeService: FileTypeService,
  ) {}

  async dna(): Promise<unknown> {
    const inputFormat = toDemuxerFormat(this.cls.fileSignature().get());
    if (!inputFormat) throw new UnsupportedMediaTypeException('Unsupported video input');
    const stdout = await this.workerService.createWorker(workerPath('./worker/index.js', import.meta.url), {
      workerData: {
        inputFormat,
        operation: 'dna',
      },
    });
    return readWorkerJson(stdout);
  }

  async metadata(): Promise<unknown> {
    const inputFormat = toDemuxerFormat(this.cls.fileSignature().get());
    if (!inputFormat) throw new UnsupportedMediaTypeException('Unsupported video input');
    const stdout = await this.workerService.createWorker(workerPath('./worker/index.js', import.meta.url), {
      workerData: {
        inputFormat,
        operation: 'metadata',
      },
    });
    return readWorkerJson(stdout);
  }

  async processor(
    options: { payload: VideoProcessorType },
  ): Promise<Readable> {
    const inputFormat = toDemuxerFormat(this.cls.fileSignature().get());
    if (!inputFormat) throw new UnsupportedMediaTypeException('Unsupported video input');
    return this.workerService.createWorker(workerPath('./worker/index.js', import.meta.url), {
      workerData: {
        inputFormat,
        operation: 'processor',
        payload: options.payload,
      },
    });
  }

  async screenshot(
    options: { payload: ScreenshotType },
  ): Promise<Readable> {
    const signature = this.cls.fileSignature().get();
    if (!signature || !this.fileTypeService.isVideo(signature.mime)) {
      throw new UnsupportedMediaTypeException('Unsupported video input');
    }
    const inputFormat = toDemuxerFormat(signature);
    if (!inputFormat) throw new UnsupportedMediaTypeException('Unsupported video input');
    return this.workerService.createWorker(workerPath('./worker/index.js', import.meta.url), {
      workerData: {
        inputFormat,
        operation: 'screenshot',
        payload: { frames: parseFrames(options.payload.frames) },
      },
    });
  }

  async stats(): Promise<unknown> {
    const inputFormat = toDemuxerFormat(this.cls.fileSignature().get());
    if (!inputFormat) throw new UnsupportedMediaTypeException('Unsupported video input');
    const stdout = await this.workerService.createWorker(workerPath('./worker/index.js', import.meta.url), {
      workerData: {
        inputFormat,
        operation: 'stats',
      },
    });
    return readWorkerJson(stdout);
  }
}