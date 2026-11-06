import type { Readable } from 'node:stream';

import { Injectable } from '@nestjs/common';
import { stream2buffer } from 'jutilities/node-stream';
import { WithSignal } from 'jutilities/types/with';

import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { WorkerService } from '@/services/worker.service.js';

import type { AudioProcessorType } from './schema.js';

@Injectable()
export class AudioService {
  constructor(
    private readonly workerService: WorkerService,
    private readonly cls: NormalizedClsService,
  ) {}

  async metadata(options: WithSignal = {}): Promise<unknown> {
    const stdout = await this.workerService.createWorker('./audio.worker.js', {
      workerData: {
        inputFormat: this.cls.fileSignature().get()?.ext,
        operation: 'metadata',
      },
    });
    const buffer = await stream2buffer(stdout, { signal: options.signal });
    return JSON.parse(buffer.toString().trim());
  }

  async processor(
    options: WithSignal<{ payload: AudioProcessorType }>,
  ): Promise<Readable> {
    return this.workerService.createWorker('./audio.worker.js', {
      workerData: {
        inputFormat: this.cls.fileSignature().get()?.ext,
        operation: 'processor',
        payload: options.payload,
      },
    });
  }

  async stats(options: WithSignal = {}): Promise<unknown> {
    const stdout = await this.workerService.createWorker('./audio.worker.js', {
      workerData: {
        inputFormat: this.cls.fileSignature().get()?.ext,
        operation: 'stats',
      },
    });
    const buffer = await stream2buffer(stdout, { signal: options.signal });
    return JSON.parse(buffer.toString().trim());
  }
}