import type { Readable } from 'node:stream';

import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';

import { FileTypeService } from '@/services/file-type.service.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { workerPath, WorkerService } from '@/services/worker.service.js';
import { readWorkerJson } from '@/utils/buffer.js';
import { toDemuxerFormat } from '@/utils/input-format.js';

import type { VideoAudioType, VideoProcessorType } from './schema.js';

import { parseFrames, type ScreenshotType } from './schema.js';

const WORKER_ENTRY = workerPath('./worker/index.js', import.meta.url);

/** Video feature service: streams uploads through workers for processing, metadata, DNA fingerprinting, stats and screenshots. */
@Injectable()
export class VideoService {
  constructor(
    private readonly workerService: WorkerService,
    private readonly cls: NormalizedClsService,
    private readonly fileTypeService: FileTypeService,
  ) {}

  /**
   * Extracts the audio stream from a video upload.
   * @param options - Audio extraction options.
   * @param options.payload - Validated query options for the audio route.
   * @returns A readable stream of the encoded audio.
   * @throws UnsupportedMediaTypeException when the upload has no video signature or demuxer mapping.
   */
  async audio(options: { payload: VideoAudioType }): Promise<Readable> {
    const signature = this.cls.fileSignature().get();
    if (!signature || !this.fileTypeService.isVideo(signature.mime)) {
      throw new UnsupportedMediaTypeException('Unsupported video input');
    }
    const inputFormat = this.requireInputFormat();
    return this.workerService.createWorker(WORKER_ENTRY, {
      workerData: { inputFormat, operation: 'audio', payload: options.payload },
    });
  }

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
    options: { payload: VideoProcessorType },
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

  async screenshot(
    options: { payload: ScreenshotType },
  ): Promise<Readable> {
    const signature = this.cls.fileSignature().get();
    if (!signature || !this.fileTypeService.isVideo(signature.mime)) {
      throw new UnsupportedMediaTypeException('Unsupported video input');
    }
    const inputFormat = this.requireInputFormat();
    return this.workerService.createWorker(WORKER_ENTRY, {
      workerData: {
        inputFormat,
        operation: 'screenshot',
        payload: { frames: parseFrames(options.payload.frames) },
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
    if (!inputFormat) throw new UnsupportedMediaTypeException('Unsupported video input');
    return inputFormat;
  }
}
