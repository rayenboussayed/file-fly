import type { Readable } from 'node:stream';

import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';

import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { workerPath, WorkerService } from '@/services/worker.service.js';
import { readWorkerJson } from '@/utils/buffer.js';
import { toDemuxerFormat } from '@/utils/input-format.js';

import type { AudioProcessorType } from './schema.js';

/** Audio feature service: streams uploads through workers for processing, metadata, DNA fingerprinting and stats. */
@Injectable()
export class AudioService {
  constructor(
    private readonly workerService: WorkerService,
    private readonly cls: NormalizedClsService,
  ) {}

  async dna(): Promise<unknown> {
    const inputFormat = toDemuxerFormat(this.cls.fileSignature().get());
    if (!inputFormat) throw new UnsupportedMediaTypeException('Unsupported audio input');
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
    if (!inputFormat) throw new UnsupportedMediaTypeException('Unsupported audio input');
    const stdout = await this.workerService.createWorker(workerPath('./worker/index.js', import.meta.url), {
      workerData: {
        inputFormat,
        operation: 'metadata',
      },
    });
    return readWorkerJson(stdout);
  }

  async processor(
    options: { payload: AudioProcessorType },
  ): Promise<Readable> {
    const inputFormat = toDemuxerFormat(this.cls.fileSignature().get());
    if (!inputFormat) throw new UnsupportedMediaTypeException('Unsupported audio input');
    return this.workerService.createWorker(workerPath('./worker/index.js', import.meta.url), {
      workerData: {
        inputFormat,
        operation: 'processor',
        payload: options.payload,
      },
    });
  }

  async stats(): Promise<unknown> {
    const inputFormat = toDemuxerFormat(this.cls.fileSignature().get());
    if (!inputFormat) throw new UnsupportedMediaTypeException('Unsupported audio input');
    const stdout = await this.workerService.createWorker(workerPath('./worker/index.js', import.meta.url), {
      workerData: {
        inputFormat,
        operation: 'stats',
      },
    });
    return readWorkerJson(stdout);
  }
}