import type { Readable } from 'node:stream';

import { Injectable } from '@nestjs/common';
import { stream2buffer } from 'jutilities/node-stream';
import { WithSignal } from 'jutilities/types/with';

import { WorkerService } from '@/services/worker.service.js';

import type { VideoProcessorType } from './schema.js';

@Injectable()
export class VideoService {
  constructor(private readonly workerService: WorkerService) {}

  async metadata(options: WithSignal = {}): Promise<unknown> {
    const stdout = await this.workerService.createWorker('./video.worker.js', {
      workerData: { operation: 'metadata' },
    });
    const buffer = await stream2buffer(stdout, { signal: options.signal });
    return JSON.parse(buffer.toString().trim());
  }

  async processor(
    options: WithSignal<{ payload: VideoProcessorType }>,
  ): Promise<Readable> {
    return this.workerService.createWorker('./video.worker.js', {
      workerData: { operation: 'processor', payload: options.payload },
    });
  }

  async stats(options: WithSignal = {}): Promise<unknown> {
    const stdout = await this.workerService.createWorker('./video.worker.js', {
      workerData: { operation: 'stats' },
    });
    const buffer = await stream2buffer(stdout, { signal: options.signal });
    return JSON.parse(buffer.toString().trim());
  }
}