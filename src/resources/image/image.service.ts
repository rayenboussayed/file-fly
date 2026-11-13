import type { Readable } from 'node:stream';

import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';
import { stream2buffer } from 'jutilities/node-stream';
import sharp from 'sharp';

import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { workerPath, WorkerService } from '@/services/worker.service.js';
import { bufferStream } from '@/utils/buffer.js';
import { loadPdq } from '@/utils/pdq.js';
import { PDQ_WASM_VERSION, SHARP_VERSION } from '@/utils/versions.js';

import type { ImageProcessorType } from './schema.js';
import type { ImageDnaResult } from './type.js';

import { FileTypeService } from '../../services/file-type.service.js';

@Injectable()
export class ImageService {
  constructor(
    private readonly workerService: WorkerService,
    private readonly cls: NormalizedClsService,
    private readonly fileTypeService: FileTypeService,
  ) {}

  async dna(): Promise<ImageDnaResult> {
    const signature = this.cls.fileSignature().get();
    if (!signature || !this.fileTypeService.isImage(signature.mime)) {
      throw new UnsupportedMediaTypeException('Unsupported image input');
    }
    const stream = this.cls.sourceStream().get() as Readable;
    const input = await bufferStream(stream);
    // Pre-shrink to at most 1024 px on the long side (without enlargement):
    // keeps latency bounded on huge images while costing ~1 PDQ bit of margin.
    // `fastShrinkOnLoad: false` forces a full decode, keeping the hash stable
    // across save formats.
    const { data, info } = await sharp(input, { failOn: 'error', limitInputPixels: 100_000_000 })
      .autoOrient()
      .flatten({ background: '#fff' })
      .removeAlpha()
      .toColourspace('srgb')
      .resize(1024, 1024, { fastShrinkOnLoad: false, fit: 'inside', withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pdq = await loadPdq();
    // Buffer is a Uint8Array view; re-wrap to a plain Uint8Array for PDQ.
    const pixels = new Uint8Array(data.buffer, data.byteOffset, data.length);
    const result = pdq.hash({ channels: 3, data: pixels, height: info.height, width: info.width });
    return {
      algorithm: 'pdq',
      env: { pdqWasm: PDQ_WASM_VERSION, sharp: SHARP_VERSION },
      hash: pdq.toHex(result.hash),
      quality: result.quality,
      version: 'pdq@1',
    };
  }

  async metadata(): Promise<unknown> {
    const stdout = await this.workerService.createWorker(workerPath('./worker/index.js', import.meta.url), {
      workerData: { operation: 'metadata' },
    });
    const buffer = await stream2buffer(stdout);
    return JSON.parse(buffer.toString().trim());
  }

  async ocr(): Promise<Readable> {
    const signature = this.cls.fileSignature().get();
    if (!signature || !this.fileTypeService.isImage(signature.mime)) {
      throw new UnsupportedMediaTypeException('Unsupported image input');
    }
    return this.workerService.createWorker(workerPath('./worker/index.js', import.meta.url), {
      workerData: { operation: 'ocr' },
    });
  }

  async processor(
    options: { payload: ImageProcessorType },
  ): Promise<Readable> {
    const signature = this.cls.fileSignature().get();
    if (!signature || !this.fileTypeService.isImage(signature.mime)) {
      throw new UnsupportedMediaTypeException('Unsupported image input');
    }
    return this.workerService.createWorker(workerPath('./worker/index.js', import.meta.url), {
      workerData: { operation: 'processor', payload: options.payload },
    });
  }

  async stats(): Promise<unknown> {
    const stdout = await this.workerService.createWorker(workerPath('./worker/index.js', import.meta.url), {
      workerData: { operation: 'stats' },
    });
    const buffer = await stream2buffer(stdout);
    return JSON.parse(buffer.toString().trim());
  }
}