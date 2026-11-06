import type { Readable } from 'node:stream';

import { Injectable } from '@nestjs/common';
import { stream2buffer } from 'jutilities/node-stream';
import { WithSignal } from 'jutilities/types/with';

import { DemuxerFormatSchema } from '@/constants/av-formats.js';
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
        inputFormat: DemuxerFormatSchema.safeParse(this.cls.fileSignature().get()?.ext).data,
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
        inputFormat:
          options.payload.inputFormat ??
          DemuxerFormatSchema.safeParse(this.cls.fileSignature().get()?.ext).data,
        operation: 'processor',
        payload: options.payload,
      },
    });
  }

  async stats(options: WithSignal = {}): Promise<unknown> {
    const stdout = await this.workerService.createWorker('./audio.worker.js', {
      workerData: {
        inputFormat: DemuxerFormatSchema.safeParse(this.cls.fileSignature().get()?.ext).data,
        operation: 'stats',
      },
    });
    const buffer = await stream2buffer(stdout, { signal: options.signal });
    return JSON.parse(buffer.toString().trim());
  }
}