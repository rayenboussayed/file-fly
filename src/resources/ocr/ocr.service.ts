import type { Readable } from 'node:stream';

import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';

import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { bufferStream } from '@/utils/buffer.js';

import type { OcrType } from './schema.js';

import { FileTypeService } from '../../services/file-type.service.js';
import { TesseractService } from './tesseract.service.js';

@Injectable()
export class OcrService {
  constructor(
    private readonly tesseract: TesseractService,
    private readonly cls: NormalizedClsService,
    private readonly fileTypeService: FileTypeService,
  ) {}

  async ocr(options: { payload: OcrType }): Promise<{
    confidence: number;
    text: string;
  }> {
    const signature = this.cls.fileSignature().get();
    if (!signature || !this.fileTypeService.isImage(signature.mime)) {
      throw new UnsupportedMediaTypeException('Unsupported image input');
    }

    const stream = this.cls.sourceStream().get() as Readable;
    const buffer = await bufferStream(stream);

    const langs = this.parseLangs(options.payload.lang);
    return this.tesseract.recognize(buffer, langs);
  }

  parseLangs(raw?: string): string[] {
    if (!raw) return ['eng'];
    const langs = [...new Set(
      raw
        .split('+')
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0),
    )].sort().slice(0, 4);
    if (langs.length === 0) return ['eng'];
    return langs;
  }
}
