import type { Readable } from 'node:stream';

import { Injectable, Logger, UnsupportedMediaTypeException } from '@nestjs/common';
import sharp from 'sharp';

import { FileTypeService } from '@/services/file-type.service.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { workerPath, WorkerService } from '@/services/worker.service.js';
import { bufferStream, readWorkerJson } from '@/utils/buffer.js';
import { loadPdq } from '@/utils/pdq.js';
import { PDQ_WASM_VERSION, SHARP_VERSION } from '@/utils/versions.js';

import type { ImageProcessorType, OcrType } from './schema.js';
import type { ImageDnaResult, ImageOcrResult } from './type.js';

import { TesseractService } from './tesseract.service.js';

const WORKER_ENTRY = workerPath('./worker/index.js', import.meta.url);

/** Image feature service: streams uploads through sharp workers for processing, metadata, DNA, stats and OCR. */
@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);

  constructor(
    private readonly cls: NormalizedClsService,
    private readonly fileTypeService: FileTypeService,
    private readonly tesseract: TesseractService,
    private readonly workerService: WorkerService,
  ) {}

  async dna(): Promise<ImageDnaResult> {
    const signature = this.cls.fileSignature().get();
    if (!signature || !this.fileTypeService.isImage(signature.mime)) {
      throw new UnsupportedMediaTypeException('Unsupported image input');
    }
    // By construction, FileParserInterceptor binds sourceStream before any service method runs.
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
    const stdout = await this.workerService.createWorker(WORKER_ENTRY, {
      workerData: { operation: 'metadata' },
    });
    return readWorkerJson(stdout);
  }

  async ocr(
    options: { payload: OcrType },
  ): Promise<ImageOcrResult> {
    const signature = this.cls.fileSignature().get();
    if (!signature || !this.fileTypeService.isImage(signature.mime)) {
      throw new UnsupportedMediaTypeException('Unsupported image input');
    }
    // By construction, FileParserInterceptor binds sourceStream before any service method runs.
    const buffer = await bufferStream(this.cls.sourceStream().get() as Readable);
    const input = await this.preprocess(buffer);
    return this.tesseract.recognize(input, this.parseLangs(options.payload.lang));
  }

  async processor(
    options: { payload: ImageProcessorType },
  ): Promise<Readable> {
    const signature = this.cls.fileSignature().get();
    if (!signature || !this.fileTypeService.isImage(signature.mime)) {
      throw new UnsupportedMediaTypeException('Unsupported image input');
    }
    return this.workerService.createWorker(WORKER_ENTRY, {
      workerData: { operation: 'processor', payload: options.payload },
    });
  }

  async stats(): Promise<unknown> {
    const stdout = await this.workerService.createWorker(WORKER_ENTRY, {
      workerData: { operation: 'stats' },
    });
    return readWorkerJson(stdout);
  }

  /**
   * Normalizes the `lang` query value: splits on `+` or `,`, lowercases,
   * trims, dedupes, sorts; defaults to `['eng']`, caps at 4 codes.
   * @param raw - Raw `lang` query parameter (already regex-validated).
   * @returns Sorted, deduped language codes.
   */
  private parseLangs(raw?: string): string[] {
    if (!raw) return ['eng'];
    const langs = [...new Set(
      raw
        .split(/[+,]/)
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0),
    )]
      .sort()
      .slice(0, 4);
    return langs.length === 0 ? ['eng'] : langs;
  }

  /**
   * Preprocesses an image for OCR: auto-orient, downscale to at most 2000 px
   * without enlarging, greyscale, normalize, sharpen; encoded as PNG.
   * Pixel bombs are rejected via `limitInputPixels`; undecodable or malicious
   * input surfaces as {@link UnsupportedMediaTypeException} instead of a 500.
   * @param input - Raw (signature-verified) image bytes.
   * @returns PNG bytes ready for tesseract.
   */
  private async preprocess(input: Buffer): Promise<Buffer> {
    try {
      return await sharp(input, { failOn: 'error', limitInputPixels: 100_000_000 })
        .rotate()
        .resize({ fit: 'inside', height: 2000, width: 2000, withoutEnlargement: true })
        .greyscale()
        .normalize()
        .sharpen({ sigma: 1 })
        .png({ compressionLevel: 9 })
        .toBuffer();
    } catch (error) {
      // Clients see a generic 415 (Nest does not serialize `cause`); log the
      // sharp/libvips reason for operators.
      this.logger.warn(`Image could not be decoded: ${String(error)}`);
      throw new UnsupportedMediaTypeException('Image could not be decoded', { cause: error });
    }
  }
}
