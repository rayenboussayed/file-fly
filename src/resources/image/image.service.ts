import type { Readable } from 'node:stream';
import type { Metadata as SharpMetadata } from 'sharp';

import { Injectable } from '@nestjs/common';
import { stream2buffer } from 'jutilities/node-stream';
import { WithSignal } from 'jutilities/types/with';

import { WorkerService } from '@/services/worker.service.js';

import type { ImageProcessorType } from './schema.js';

@Injectable()
export class ImageService {
  constructor(private readonly workerService: WorkerService) {}

  async metadata(options: WithSignal = {}): Promise<SharpMetadata> {
    const stdout = await this.workerService.createWorker('./image.worker.js', {
      workerData: { operation: 'metadata' },
    });
    const buffer = await stream2buffer(stdout, { signal: options.signal });
    return JSON.parse(buffer.toString().trim()) as SharpMetadata;
  }

  async processor(
    options: WithSignal<{ payload: ImageProcessorType }>,
  ): Promise<Readable> {
    return this.workerService.createWorker('./image.worker.js', {
      workerData: { operation: 'processor', payload: options.payload },
    });
  }

  async stats(options: WithSignal = {}): Promise<unknown> {
    const stdout = await this.workerService.createWorker('./image.worker.js', {
      workerData: { operation: 'stats' },
    });
    const buffer = await stream2buffer(stdout, { signal: options.signal });
    return JSON.parse(buffer.toString().trim());
  }

}