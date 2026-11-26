import {
  BadRequestException,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { PDFDocument } from 'pdf-lib';
import { extractText, getDocumentProxy, getMeta } from 'unpdf';

import { environment } from '@/environment.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { bufferStream } from '@/utils/buffer.js';
import { requestMime } from '@/utils/http.js';
import { openMediaSource } from '@/utils/open-source.js';

import { buildPdfDocument } from './builder.js';
import { PDF_MIME, type PdfBuildType } from './schema.js';

/**
 * Opens the uploaded body, bounded by the scanner cap.
 * The scanner only opens the source when ClamAV is enabled, so the service must too.
 * @param cls - Normalized request context.
 * @returns The body bytes, capped.
 */
const readBody = async (cls: NormalizedClsService): Promise<Buffer> => {
  const mime = requestMime(cls);
  if (mime !== PDF_MIME && mime !== 'application/octet-stream') {
    throw new UnsupportedMediaTypeException(`Unsupported media type "${mime}" for PDF input`);
  }
  await openMediaSource(cls);
  const stream = cls.sourceStream().get();
  if (!stream) {
    throw new BadRequestException({ code: 'PDF_NO_SOURCE', message: 'PDF body is missing' });
  }
  return bufferStream(stream, environment.CLAMAV_MAX_BYTES);
};

/**
 * Signature must be %PDF; closes the renamed-image and non-PDF holes.
 * @param buffer - The buffered upload.
 */
const assertPdfSignature = async (buffer: Buffer): Promise<void> => {
  const signature = await fileTypeFromBuffer(buffer);
  if (signature?.mime !== PDF_MIME) {
    throw new UnsupportedMediaTypeException('Uploaded bytes are not a PDF document');
  }
};

const loadDocument = async (buffer: Buffer): Promise<PDFDocument> => {
  try {
    return await PDFDocument.load(new Uint8Array(buffer), { ignoreEncryption: true, throwOnInvalidObject: false });
  } catch {
    // PDF.js finds what pdf-lib cannot; fall through to a hard failure below.
    throw new BadRequestException({ code: 'PDF_UNREADABLE', message: 'the uploaded bytes are not a readable PDF' });
  }
};

const metadataOf = async (buffer: Buffer) => {
  try {
    const pdfDocument = await loadDocument(buffer);
    const keywords = pdfDocument.getKeywords();
    const firstPage = pdfDocument.getPageCount() > 0 ? pdfDocument.getPage(0) : undefined;
    const size = firstPage?.getSize();
    let orientation: 'landscape' | 'portrait' | undefined;
    // width > height => landscape; square pages report portrait.
    if (size !== undefined) orientation = size.width > size.height ? 'landscape' : 'portrait';
    return {
      author: pdfDocument.getAuthor(),
      creationDate: pdfDocument.getCreationDate()?.toISOString(),
      creator: pdfDocument.getCreator(),
      encrypted: pdfDocument.isEncrypted,
      keywords,
      modificationDate: pdfDocument.getModificationDate()?.toISOString(),
      orientation,
      pageCount: pdfDocument.getPageCount(),
      pageSize: size === undefined ? undefined : { height: size.height, width: size.width },
      producer: pdfDocument.getProducer(),
      subject: pdfDocument.getSubject(),
      title: pdfDocument.getTitle(),
    };
  } catch {
    throw new BadRequestException({ code: 'PDF_UNREADABLE', message: 'the uploaded bytes are not a readable PDF' });
  }
};

/**
Ceiling on extracted pages; plenty for legitimate decks, stops crafted fan-outs.
 */
const MAX_EXTRACT_PAGES = 500;

/**
 * Normalizes pdf.js info dates to ISO strings (Date objects pass through toISOString).
 * @param value - The raw info-dict date value.
 * @returns The ISO string, or the stringified value for non-Date inputs.
 */
const isoOrString = (value: Date | null | string | undefined): string | undefined => {
  if (value === undefined || value === null) return undefined;
  return value instanceof Date ? value.toISOString() : String(value);
};

/**
PDF feature service: builds documents, extracts text and reads metadata.
 */
@Injectable()
export class PdfService {
  constructor(private readonly cls: NormalizedClsService) {}

  /**
   * Builds a PDF from the payload in-process and returns the bytes.
   * @param body - Validated build payload.
   * @returns The .pdf bytes.
   */
  async build(body: PdfBuildType): Promise<Buffer> {
    return Buffer.from(await buildPdfDocument(body));
  }

  /**
   * Extracts text from an uploaded document, page by page.
   * @returns The parsed metadata plus per-page text.
   */
  async extract() {
    const buffer = await readBody(this.cls);
    await assertPdfSignature(buffer);
    try {
      const document = await getDocumentProxy(new Uint8Array(buffer), { maxImageSize: 16 * 1024 * 1024 });
      if (document.numPages > MAX_EXTRACT_PAGES) {
        throw new BadRequestException({
          code: 'PDF_TOO_MANY_PAGES',
          message: `document has more than ${MAX_EXTRACT_PAGES} pages`,
        });
      }
      const { text, totalPages } = await extractText(document, { mergePages: false });
      const meta = await getMeta(document, { parseDates: true });
      // unpdf with mergePages: false always returns a per-page array (unpdf/dist/index.mjs).
      const perPage = text;
      return {
        format: 'pdf',
        metadata: {
          author: meta.info?.Author,
          creationDate: isoOrString(meta.info?.CreationDate),
          creator: meta.info?.Creator,
          keywords: meta.info?.Keywords,
          modificationDate: isoOrString(meta.info?.ModDate),
          producer: meta.info?.Producer,
          subject: meta.info?.Subject,
          title: meta.info?.Title,
        },
        pageCount: totalPages,
        structure: {
          pages: perPage.map((pageText, index) => ({ page: index + 1, text: pageText })),
        },
        text: perPage.join('\n\n'),
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException({ code: 'PDF_UNREADABLE', message: 'the uploaded bytes are not a readable PDF' });
    }
  }

  /**
   * Normalized PDF metadata for an uploaded document.
   * @returns Format plus the parsed properties.
   */
  async metadata() {
    const buffer = await readBody(this.cls);
    await assertPdfSignature(buffer);
    return { format: 'pdf', ...(await metadataOf(buffer)) };
  }
}
