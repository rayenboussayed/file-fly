import type { Readable } from 'node:stream';

import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';

import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { workerPath, WorkerService } from '@/services/worker.service.js';
import { readWorkerJson } from '@/utils/buffer.js';
import { toDemuxerFormat } from '@/utils/input-format.js';

import type { AudioProcessorType } from './schema.js';

const WORKER_ENTRY = workerPath('./worker/index.js', import.meta.url);

/** Audio feature service: streams uploads through workers for processing, metadata, DNA fingerprinting and stats. */
@Injectable()
export class AudioService {
  constructor(
    private readonly workerService: WorkerService,
    private readonly cls: NormalizedClsService,
  ) {}

  async dna(): Promise<unknown> {
    const inputFormat = this.requireInputFormat();
    const stdout = await this.workerService.createWorker(WORKER_ENTRY, {
      workerData: {
        inputFormat,
        operation: 'dna',
      },
    });
    return readWorkerJson(stdout);
  }

  async metadata(): Promise<unknown> {
    const inputFormat = this.requireInputFormat();
    const stdout = await this.workerService.createWorker(WORKER_ENTRY, {
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
    const inputFormat = this.requireInputFormat();
    return this.workerService.createWorker(WORKER_ENTRY, {
      workerData: {
        inputFormat,
        operation: 'processor',
        payload: options.payload,
      },
    });
  }

  async stats(): Promise<unknown> {
    const inputFormat = this.requireInputFormat();
    const stdout = await this.workerService.createWorker(WORKER_ENTRY, {
      workerData: {
        inputFormat,
        operation: 'stats',
      },
    });
    return readWorkerJson(stdout);
  }

  /**
   * Resolves the upload's detected signature to an FFmpeg demuxer format,
   * throwing the route's 415 when the signature is missing or unsupported.
   * @returns The resolved demuxer format name.
   * @throws {UnsupportedMediaTypeException} When the signature has no demuxer mapping.
   */
  private requireInputFormat(): string {
    const inputFormat = toDemuxerFormat(this.cls.fileSignature().get());
    if (!inputFormat) throw new UnsupportedMediaTypeException('Unsupported audio input');
    return inputFormat;
  }
}
