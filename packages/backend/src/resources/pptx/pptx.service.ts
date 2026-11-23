import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { superjson } from 'jutilities/json';
import path from 'node:path';

import { environment } from '@/environment.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { parseOoxmlMetadata } from '@/services/ooxml-meta.js';
import { OoxmlError, OoxmlReader } from '@/services/ooxml-reader.js';
import { attr, collectByKey, collectByLocalName, collectRelationships, textOf, xml, xmlRaw } from '@/services/ooxml-xml.js';
import { workerPath, WorkerService } from '@/services/worker.service.js';
import { bufferStream } from '@/utils/buffer.js';
import { requestContentType } from '@/utils/http.js';
import { hyperlinkUrlOk } from '@/utils/hyperlinks.js';
import { openMediaSource } from '@/utils/open-source.js';

import { PPTX_MIME, type PptxBuildType } from './schema.js';

/**
 * Maps the shared OOXML reader's cap violations to HTTP errors (413 for size, 400 otherwise).
 * @param buffer - The buffered upload.
 * @param limits - Optional per-call cap overrides.
 * @returns The extracted package parts.
 */
const readPartsCapped = (
  buffer: Buffer,
  limits?: Parameters<typeof OoxmlReader.readParts>[1],
) => {
  try {
    return OoxmlReader.readParts(buffer, limits);
  } catch (error) {
    if (!(error instanceof OoxmlError)) throw error;
    if (error.message.includes('per-entry cap') || error.message.includes('total uncompressed')) {
      throw new PayloadTooLargeException(error.message);
    }
    throw new BadRequestException({ code: 'PPTX_INVALID_ZIP', message: error.message });
  }
};

/**
 * Validates the run-level hyperlink allowlist.
 * @param record - The inspected dictionary; hyperlink lives at `record.hyperlink.url`.
 */
const assertHyperlinkScheme = (record: Record<string, unknown>): void => {
  const hyperlink = record['hyperlink'];
  const url =
    hyperlink && typeof hyperlink === 'object'
      ? (hyperlink as Record<string, unknown>)['url']
      : undefined;
  if (typeof url !== 'string') return;
  if (hyperlinkUrlOk(url)) return;
  throw new BadRequestException({
    code: 'PPTX_HYPERLINK_SCHEME_NOT_ALLOWED',
    message: 'hyperlink URLs must use http, https or mailto',
  });
};

/**
 * Rejects payloads whose serialized size or element count could exhaust memory.
 * @param body - The validated build payload.
 */
const assertBuildPayload = (body: PptxBuildType): void => {
  let elements = 0;
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (value && typeof value === 'object') {
      elements += 1;
      if (elements > 50_000) {
        throw new PayloadTooLargeException('presentation exceeds the element cap');
      }
      const record = value as Record<string, unknown>;
      assertHyperlinkScheme(record);
      if (record['type'] === 'table') {
        validateTableSpans(record);
      }
      for (const child of Object.values(record)) visit(child);
    }
  };
  visit(body);
};

const validateTableSpans = (table: Record<string, unknown>): void => {
  const rows = Array.isArray(table['rows']) ? (table['rows'] as unknown[]) : [];
  // pptxgenjs derives <a:tblGrid> from row 0's effective width; wider later rows break the grid.
  const gridWidth = rows.length > 0 ? rowWidth(rows[0]) : 0;
  rows.forEach((row, rowIndex) => {
    const width = rowWidth(row);
    if (width > gridWidth) {
      throw new BadRequestException({
        code: 'PPTX_ROW_WIDER_THAN_GRID',
        message: `row ${rowIndex + 1} (width ${width}) exceeds the table grid width ${gridWidth}`,
      });
    }
    if (!Array.isArray(row)) return;
    for (const cell of row) {
      if (!cell || typeof cell !== 'object') continue;
      const record = cell as Record<string, unknown>;
      const rowSpan = Number(record['rowSpan'] ?? (record['options'] as Record<string, unknown> | undefined)?.['rowspan'] ?? 1);
      if (rowSpan > rows.length - rowIndex) {
        throw new BadRequestException({
          code: 'PPTX_ROWSPAN_EXCEEDS_ROWS',
          message: `rowSpan ${rowSpan} exceeds the ${rows.length - rowIndex} row(s) remaining`,
        });
      }
    }
  });
};

const rowWidth = (row: unknown): number => {
  if (!Array.isArray(row)) return 0;
  return row.reduce<number>((sum, cell) => {
    if (!cell || typeof cell !== 'object') return sum + 1;
    const record = cell as Record<string, unknown>;
    const colSpan = Number(record['colSpan'] ?? (record['options'] as Record<string, unknown> | undefined)?.['colspan'] ?? 1);
    return sum + colSpan;
  }, 0);
};

/**
 * Opens the uploaded body, bounded by the scanner cap.
 * @param cls - Normalized request context.
 * @returns The body bytes, capped.
 */
const readBody = async (cls: NormalizedClsService): Promise<Buffer> => {
  const contentType = requestContentType(cls);
  const mime = contentType.split(';', 1)[0]?.trim() ?? ''; // split always yields a first element; the ?? '' is for the type system
  if (mime !== PPTX_MIME && mime !== 'application/octet-stream') {
    throw new UnsupportedMediaTypeException(`Unsupported media type "${mime}" for PPTX input`);
  }
  await openMediaSource(cls);
  const stream = cls.sourceStream().get();
  if (!stream) {
    throw new BadRequestException({ code: 'PPTX_NO_SOURCE', message: 'PPTX body is missing' });
  }
  return bufferStream(stream, environment.CLAMAV_MAX_BYTES);
};

/**
 * Signature must be the plain pptx mime; closes the renamed-image and .potm/.pptm holes.
 * @param buffer - The buffered upload.
 */
const assertPptxSignature = async (buffer: Buffer): Promise<void> => {
  const signature = await fileTypeFromBuffer(buffer);
  if (signature?.mime !== PPTX_MIME) {
    throw new UnsupportedMediaTypeException('Uploaded bytes are not a plain .pptx presentation');
  }
};

const slideOrder = (parts: Map<string, Buffer>): string[] => {
  const presentationXml = OoxmlReader.partText(parts, 'ppt/presentation.xml');
  if (presentationXml === undefined) {
    throw new BadRequestException({
      code: 'PPTX_NOT_A_PRESENTATION',
      message: 'ppt/presentation.xml is missing',
    });
  }
  // Parse with prefixes preserved: `r:id` and `id` must not collide.
  const presentation = xmlRaw.parse(presentationXml) as Record<string, unknown>;
  const sldIds = collectByLocalName(presentation, 'sldId');
  if (sldIds.length === 0) {
    throw new BadRequestException({
      code: 'PPTX_NOT_A_PRESENTATION',
      message: 'presentation.xml contains no sldIdLst',
    });
  }
  const rels = collectRelationships(OoxmlReader.partText(parts, 'ppt/_rels/presentation.xml.rels'));
  return sldIds.map((entry) => {
    const record = entry as Record<string, unknown>;
    const relId = attr(record, 'r:id');
    const target = relId === '' ? undefined : rels.get(relId)?.target;
    if (target === undefined) {
      throw new BadRequestException({
        code: 'PPTX_SLIDE_MISSING',
        message: `slide relationship ${relId} is missing or unresolvable`,
      });
    }
    const cleaned = target.replace(/\\/g, '/').replace(/^\/+/, '');
    return path.posix.normalize(cleaned.startsWith('ppt/') ? cleaned : `ppt/${cleaned}`);
  });
};


/**
 * Extracts every slide's shape text, in presentation order.
 * @param parts - The validated OOXML parts.
 * @returns The per-slide text blocks.
 */
const extractPptx = (parts: Map<string, Buffer>) => {
  const order = slideOrder(parts);
  const slides = order.map((name, index) => {
    const part = OoxmlReader.partText(parts, name);
    if (part === undefined) {
      throw new BadRequestException({
        code: 'PPTX_SLIDE_MISSING',
        message: `slide part ${name} is missing`,
      });
    }
    const parsed = xml.parse(part) as Record<string, unknown>;
    // Text of shapes AND table cells; charts are graphical frames, their axis labels are not text runs.
    const texts = [...collectByKey(parsed, 'sp'), ...collectByKey(parsed, 'tc')]
      .map((node) => textOf(node))
      .filter((t) => t !== '');
    return { index: index + 1, part: name, texts };
  });
  return { slides };
};

const notesNumber = (name: string): number => Number(name.replace(/\D/g, '')) || 0;

/**
 * Notes text per notes slide, sorted by the numeric suffix. The slide-number
 * placeholder shape (`ph type="sldNum"`) is excluded, so cached slide numbers
 * do not leak into the notes.
 * @param parts - The validated OOXML parts.
 * @returns The non-empty notes-slide texts, in slide order when filenames are numbered.
 */
const collectNotes = (parts: Map<string, Buffer>): string[] => {
  const entries: Array<{ name: string; text: string }> = [];
  for (const name of parts.keys()) {
    const match = /^ppt\/notesSlides\/([^/]+)\.xml$/.exec(name);
    if (match?.[1] === undefined) continue;
    const part = OoxmlReader.partText(parts, name);
    if (part === undefined) continue;
    const parsed = xml.parse(part) as Record<string, unknown>;
    const texts = collectByKey(parsed, 'sp')
      .filter((shape) => {
        const ph = collectByKey(shape, 'ph');
        return ph.length === 0 || attr(ph[0], 'type') !== 'sldNum';
      })
      .map((shape) => textOf(shape))
      .filter((text) => text !== '');
    if (texts.length > 0) entries.push({ name: match[1], text: texts.join('\n') });
  }
  return entries
    .sort((a, b) => notesNumber(a.name) - notesNumber(b.name))
    .map((entry) => entry.text);
};

/** PPTX feature service: builds decks and parses/metadata-inspects uploads. */
@Injectable()
export class PptxService {
  constructor(
    private readonly cls: NormalizedClsService,
    private readonly workerService: WorkerService,
  ) {}

  /**
   * Builds a .pptx from the payload in a worker thread and returns the bytes.
   * Buffers before returning so a worker failure answers 500, never a truncated 201.
   * @param body - Validated build payload.
   * @returns The .pptx bytes.
   */
  async build(body: PptxBuildType): Promise<Buffer> {
    assertBuildPayload(body);
    this.cls.cacheKey().set(superjson.stringify(body));
    const stream = await this.workerService.createWorker(workerPath('./worker/index.js', import.meta.url), {
      workerData: { operation: 'build', payload: body },
    });
    const bytes = await bufferStream(stream, environment.CLAMAV_MAX_BYTES);
    // Defense in depth: a worker can exit 0 with truncated bytes (flush race); refuse a corrupt deck.
    try {
      const parts = OoxmlReader.readParts(bytes);
      if (!parts.has('ppt/presentation.xml')) {
        throw new Error('missing ppt/presentation.xml');
      }
    } catch (error) {
      const wrapped = new Error('pptx builder produced an invalid document');
      (wrapped as Error & { cause?: unknown }).cause = error;
      throw wrapped;
    }
    return bytes;
  }

  /**
   * Extracts text and structure from an uploaded .pptx.
   * @returns The parsed metadata, slide texts, notes and full body text.
   */
  async extract() {
    const buffer = await readBody(this.cls);
    await assertPptxSignature(buffer);
    const parts = readPartsCapped(buffer, { maxTotalUncompressed: 64 * 1024 * 1024 });
    const { slides } = extractPptx(parts);
    const text = slides.map((slide) => slide.texts.join('\n')).join('\n');
    return {
      format: 'pptx',
      metadata: parseOoxmlMetadata(parts),
      structure: {
        notes: collectNotes(parts),
        slides,
        text,
      },
    };
  }

  /**
   * Normalized OOXML metadata for an uploaded .pptx.
   * @returns Format plus the parsed properties.
   */
  async metadata() {
    const buffer = await readBody(this.cls);
    await assertPptxSignature(buffer);
    const parts = readPartsCapped(buffer, { maxTotalUncompressed: 64 * 1024 * 1024 });
    return { format: 'pptx', ...parseOoxmlMetadata(parts) };
  }
}
