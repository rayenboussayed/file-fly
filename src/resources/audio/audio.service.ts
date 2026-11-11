import type { Readable } from 'node:stream';

import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';
import { stream2buffer } from 'jutilities/node-stream';
import { WithSignal } from 'jutilities/types/with';

import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { WorkerService } from '@/services/worker.service.js';
import { toDemuxerFormat } from '@/utils/input-format.js';

import type { AudioProcessorType } from './schema.js';

@Injectable()
export class AudioService {
  constructor(
    private readonly workerService: WorkerService,
    private readonly cls: NormalizedClsService,
  ) {}

  async metadata(options: WithSignal = {}): Promise<unknown> {
    const inputFormat = toDemuxerFormat(this.cls.fileSignature().get());
    if (!inputFormat) throw new UnsupportedMediaTypeException('Unsupported audio input');
    const stdout = await this.workerService.createWorker('./audio.worker.js', {
      workerData: {
        inputFormat,
        operation: 'metadata',
      },
    });
    const buffer = await stream2buffer(stdout, { signal: options.signal });
    return JSON.parse(buffer.toString().trim());
  }

  async processor(
    options: WithSignal<{ payload: AudioProcessorType }>,
  ): Promise<Readable> {
    const inputFormat = toDemuxerFormat(this.cls.fileSignature().get());
    if (!inputFormat) throw new UnsupportedMediaTypeException('Unsupported audio input');
    return this.workerService.createWorker('./audio.worker.js', {
      workerData: {
        inputFormat,
        operation: 'processor',
        payload: options.payload,
      },
    });
  }

  async stats(options: WithSignal = {}): Promise<unknown> {
    const inputFormat = toDemuxerFormat(this.cls.fileSignature().get());
    if (!inputFormat) throw new UnsupportedMediaTypeException('Unsupported audio input');
    const stdout = await this.workerService.createWorker('./audio.worker.js', {
      workerData: {
        inputFormat,
        operation: 'stats',
      },
    });
    const buffer = await stream2buffer(stdout, { signal: options.signal });
    return JSON.parse(buffer.toString().trim());
  }
}