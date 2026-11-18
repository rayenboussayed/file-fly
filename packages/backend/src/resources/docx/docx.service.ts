import type { Readable } from 'node:stream';

import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { fileTypeFromBuffer } from 'file-type';
import { superjson } from 'jutilities/json';

import { environment } from '@/environment.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { parseOoxmlMetadata } from '@/services/ooxml-meta.js';
import { OoxmlError, OoxmlReader } from '@/services/ooxml-reader.js';
import { workerPath, WorkerService } from '@/services/worker.service.js';
import { bufferStream } from '@/utils/buffer.js';
import { openMediaSource } from '@/utils/open-source.js';

import { DOCX_MIME, type DocxBuildType } from './schema.js';

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
    throw new BadRequestException({ code: 'DOCX_INVALID_ZIP', message: error.message });
  }
};

/**
 * Opens the uploaded body, bounded by the scanner cap.
 * The scanner only opens the source when ClamAV is enabled, so the service must too.
 * @param cls - Normalized request context.
 * @returns The body bytes, capped.
 */
const readBody = async (cls: NormalizedClsService): Promise<Buffer> => {
  const contentType = String(cls.request()?.headers?.['content-type'] ?? '');
  const mime = contentType.split(';', 1)[0]?.trim() ?? '';
  if (mime !== DOCX_MIME && mime !== 'application/octet-stream') {
    throw new UnsupportedMediaTypeException(`Unsupported media type "${mime}" for DOCX input`);
  }
  await openMediaSource(cls);
  const stream = cls.sourceStream().get();
  if (!stream) {
    throw new BadRequestException({ code: 'DOCX_NO_SOURCE', message: 'DOCX body is missing' });
  }
  return bufferStream(stream as Readable, environment.CLAMAV_MAX_BYTES);
};

/**
 * Signature must be the plain docx mime; closes the renamed-image and .docm/.dotx holes.
 * @param buffer - The buffered upload.
 * @returns Nothing when the signature is confirmed.
 * @throws {UnsupportedMediaTypeException} For non-docx signatures and mismatches.
 */
const assertDocxSignature = async (buffer: Buffer): Promise<void> => {
  const signature = await fileTypeFromBuffer(buffer);
  if (signature?.mime !== DOCX_MIME) {
    throw new UnsupportedMediaTypeException('Uploaded bytes are not a plain .docx document');
  }
};

const xml = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  processEntities: false,
  removeNSPrefix: true,
  trimValues: true,
});

const attr = (value: unknown, name: string): string => {
  if (value && typeof value === 'object') {
    const inner = (value as Record<string, unknown>)[`@_${name}`];
    if (typeof inner === 'string') return inner;
  }
  return '';
};

/**
 * Depth-first walk of a parsed XML tree; visits every key/value pair.
 * @param node - The parsed XML node (or subtree).
 * @param visit - Callback per key/value pair; may throw to abort the walk.
 */
const walkXml = (node: unknown, visit: (key: string, value: unknown) => void): void => {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const item of node) walkXml(item, visit);
    return;
  }
  if (typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    visit(key, value);
    walkXml(value, visit);
  }
};

/**
 * Every element under a given key, anywhere in the tree.
 * @param node - The parsed XML node (or subtree).
 * @param key - The local (namespace-stripped) element name, e.g. `p`, `tbl`, `tr`.
 * @returns The matched elements, in document order.
 */
const collectByKey = (node: unknown, key: string): unknown[] => {
  const found: unknown[] = [];
  walkXml(node, (entryKey, value) => {
    if (entryKey !== key) return;
    for (const item of Array.isArray(value) ? value : [value]) found.push(item);
  });
  return found;
};

/**
 * Concatenated text of every <w:t> under a node (attributes ignored).
 * @param node - The parsed XML node (or subtree).
 * @returns The concatenated string.
 */
/**
 * A <w:t> node may be a plain string or { '#text': string } when attributes are kept.
 * @param value - The <w:t> node value.
 * @returns The text, or an empty string.
 */
const textValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const inner = (value as Record<string, unknown>)['#text'];
    if (inner !== undefined) return String(inner);
  }
  return '';
};

const textOf = (node: unknown): string => {
  const parts: string[] = [];
  walkXml(node, (key, value) => {
    if (key !== 't') return;
    const text = textValue(value);
    if (text !== '') parts.push(text);
  });
  return parts.join('');
};

const paragraphOf = (entry: unknown) => {
  const record = (entry ?? {}) as Record<string, unknown>;
  const pPr = (record['pPr'] ?? {}) as Record<string, unknown>;
  return {
    numPr: pPr['numPr'],
    pStyle: attr(pPr['pStyle'], 'val'),
    text: textOf(record),
  };
};

const cellTextOf = (cell: unknown): string => textOf(cell);

const extractDocumentXml = (documentXml: string, relationships: Map<string, string>) => {
  // fast-xml-parser does not throw on malformed XML; garbage input yields garbage cells,
  // which callers handle by their own caps and output shape checks.
  const parsed = xml.parse(documentXml) as Record<string, unknown>;

  const paragraphs = collectByKey(parsed, 'p').map(paragraphOf);
  const headings: Array<{ level: number; text: string }> = [];
  const lines: string[] = [];
  let lists = 0;
  for (const paragraph of paragraphs) {
    lines.push(paragraph.text);
    if (paragraph.numPr !== undefined) lists += 1;
    const headingMatch = /^(?:heading\s*|title)([1-6])?$/i.exec(paragraph.pStyle);
    if (headingMatch) {
      headings.push({ level: headingMatch[1] ? Number(headingMatch[1]) : 1, text: paragraph.text });
    }
  }

  const tables = collectByKey(parsed, 'tbl').map((table) => {
    const rows = collectByKey(table, 'tr');
    const cells = rows.map((row) =>
      collectByKey(row, 'tc').map((cell) => cellTextOf(cell)),
    );
    return {
      cells,
      columns: rows.reduce<number>((max, row) => Math.max(max, collectByKey(row, 'tc').length), 0),
      rows: rows.length,
    };
  });

  const hyperlinks = collectByKey(parsed, 'hyperlink').map((entry) => {
    const record = entry as Record<string, unknown>;
    const id = attr(record, 'id');
    const anchor = attr(record, 'anchor');
    const url = relationships.get(id) ?? (anchor ? `#${anchor}` : undefined);
    return { text: textOf(record), url };
  });

  let imageCount = 0;
  const alts: string[] = [];
  walkXml(parsed, (key, value) => {
    if (key === 'drawing' || key === 'pict') imageCount += 1;
    if (key === 'docPr') {
      const descr = attr(value, 'descr');
      if (descr !== '') alts.push(descr);
    }
  });

  return {
    headings,
    hyperlinks,
    images: { alts, count: imageCount },
    lists,
    tables,
    text: lines.join('\n'),
  };
};

/**
 * Maps r:id to Target for the word relationships part.
 * @param relsXml - The raw rels XML, or undefined.
 * @returns The id-to-url map for external relationships.
 */
const collectRelationships = (relsXml: string | undefined): Map<string, string> => {
  const map = new Map<string, string>();
  if (relsXml === undefined) return map;
  let parsed: Record<string, unknown>;
  try {
    parsed = xml.parse(relsXml) as Record<string, unknown>;
  } catch {
    return map;
  }
  for (const rel of collectByKey(parsed, 'Relationship')) {
    const record = rel as Record<string, unknown>;
    const id = attr(record, 'Id');
    const target = attr(record, 'Target');
    const mode = attr(record, 'TargetMode');
    if (id !== '' && target !== '' && mode === 'External') map.set(id, target);
  }
  return map;
};

/** URL schemes allowed for generated hyperlinks; Word opens file:/javascript:/data: links. */
const ALLOWED_SCHEMES = new Set(['http', 'https', 'mailto']);

const hyperlinkUrlOk = (url: string): boolean => {
  try {
    return ALLOWED_SCHEMES.has(new URL(url).protocol.replace(/:$/, '').toLowerCase());
  } catch {
    return false;
  }
};

/**
 * Validates build-payload cross-field rules the schema cannot express:
 * svg images must carry a fallback raster, hyperlinks need an allowed url or an anchor,
 * note/comment references must exist, ids must be unique, row spans must fit,
 * and the element count is capped to bound memory.
 * @param body - The validated build payload.
 */
/**
 * Collects and rejects duplicate note/comment ids.
 * @param body - The validated build payload.
 * @returns The unique id sets.
 */
const assertUniqueIds = (body: DocxBuildType): { commentIds: Set<number>; endnoteIds: Set<number>; noteIds: Set<number> } => {
  const noteIds = new Set<number>();
  const endnoteIds = new Set<number>();
  const commentIds = new Set<number>();
  for (const note of body.footnotes ?? []) {
    if (noteIds.has(note.id)) {
      throw new BadRequestException({ code: 'DOCX_DUPLICATE_NOTE_ID', message: `duplicate footnote id ${note.id}` });
    }
    noteIds.add(note.id);
  }
  for (const note of body.endnotes ?? []) {
    if (endnoteIds.has(note.id)) {
      throw new BadRequestException({ code: 'DOCX_DUPLICATE_NOTE_ID', message: `duplicate endnote id ${note.id}` });
    }
    endnoteIds.add(note.id);
  }
  for (const comment of body.comments ?? []) {
    if (commentIds.has(comment.id)) {
      throw new BadRequestException({ code: 'DOCX_DUPLICATE_COMMENT_ID', message: `duplicate comment id ${comment.id}` });
    }
    commentIds.add(comment.id);
  }
  return { commentIds, endnoteIds, noteIds };
};

const assertBuildPayload = (body: DocxBuildType): void => {
  const { commentIds, endnoteIds, noteIds } = assertUniqueIds(body);
  const references = new Set((body.numbering ?? []).map((n) => n.reference));
  if (references.size !== (body.numbering ?? []).length) {
    throw new BadRequestException({ code: 'DOCX_DUPLICATE_NUMBERING_REFERENCE', message: 'duplicate numbering references' });
  }

  let elements = 0;
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (value && typeof value === 'object') {
      elements += 1;
      if (elements > 50_000) {
        throw new PayloadTooLargeException('document exceeds the element cap');
      }
      const record = value as Record<string, unknown>;
      assertImageFallback(record);
      assertHyperlinkTarget(record);
      for (const child of Object.values(record)) visit(child);
    }
  };
  visit(body);

  // Note/comment cross-reference validation, one clean pass after shape checks.
  reportNoteRefs(body, noteIds, endnoteIds, commentIds);
  tables(body).forEach(validateRowSpan);
};

const assertImageFallback = (record: Record<string, unknown>): void => {
  if (
    record['type'] === 'image' &&
    record['imageType'] === 'svg' &&
    record['fallback'] === undefined
  ) {
    throw new BadRequestException({
      code: 'DOCX_SVG_FALLBACK_REQUIRED',
      message: 'svg images require a fallback raster',
    });
  }
};

const assertHyperlinkTarget = (record: Record<string, unknown>): void => {
  if (record['type'] !== 'hyperlink') return;
  if (record['url'] === undefined && record['anchor'] === undefined) {
    throw new BadRequestException({
      code: 'DOCX_HYPERLINK_TARGET_REQUIRED',
      message: 'hyperlinks require either a url or an anchor',
    });
  }
  if (record['url'] !== undefined && !hyperlinkUrlOk(String(record['url']))) {
    throw new BadRequestException({
      code: 'DOCX_HYPERLINK_SCHEME_NOT_ALLOWED',
      message: 'hyperlink URLs must use http, https or mailto',
    });
  }
};

/**
 * Collects every <w:tbl>-equivalent table element anywhere in the payload.
 * @param body
 */
/**
 * Collects every table element anywhere in the payload.
 * @param body - The validated build payload.
 * @returns The table records, in document order.
 */
const tables = (body: DocxBuildType): Array<Record<string, unknown>> => {
  const found: Array<Record<string, unknown>> = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if (record['type'] === 'table') found.push(record);
      for (const child of Object.values(record)) visit(child);
    }
  };
  visit(body);
  return found;
};

/**
 * Rejects rowSpan values that exceed the rows remaining in their own table.
 * @param table
 */
/**
 * Rejects rowSpan values exceeding the rows remaining in the table.
 * @param table - The table record.
 */
const validateRowSpan = (table: Record<string, unknown>): void => {
  const rows = Array.isArray(table['rows']) ? (table['rows'] as unknown[]) : [];
  rows.forEach((row, rowIndex) => validateCellSpan(row, rowIndex, rows.length));
};

const validateCellSpan = (row: unknown, rowIndex: number, rowCount: number): void => {
  if (!Array.isArray(row)) return;
  for (const cell of row) {
    if (!cell || typeof cell !== 'object') continue;
    const span = Number((cell as Record<string, unknown>)['rowSpan'] ?? 1);
    if (span > rowCount - rowIndex) {
      throw new BadRequestException({
        code: 'DOCX_ROWSPAN_EXCEEDS_ROWS',
        message: `rowSpan ${span} exceeds the ${rowCount - rowIndex} row(s) remaining`,
      });
    }
  }
};

/**
 * Rejects note/comment references that are not declared.
 * @param body - The validated build payload.
 * @param noteIds - The declared footnote ids.
 * @param endnoteIds - The declared endnote ids.
 * @param commentIds - The declared comment ids.
 */
const reportNoteRefs = (
  body: DocxBuildType,
  noteIds: Set<number>,
  endnoteIds: Set<number>,
  commentIds: Set<number>,
): void => {
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (value && typeof value === 'object') {
      checkNoteRef(value as Record<string, unknown>, noteIds, endnoteIds, commentIds);
      for (const child of Object.values(value as Record<string, unknown>)) visit(child);
    }
  };
  visit(body);
};

/**
 * Rejects one record's note/comment references when they are not declared.
 * @param record - The inspected dictionary.
 * @param noteIds - The declared footnote ids.
 * @param endnoteIds - The declared endnote ids.
 * @param commentIds - The declared comment ids.
 */
const checkNoteRef = (
  record: Record<string, unknown>,
  noteIds: Set<number>,
  endnoteIds: Set<number>,
  commentIds: Set<number>,
): void => {
  if (typeof record['footnote'] === 'number' && !noteIds.has(record['footnote'])) {
    throw new BadRequestException({ code: 'DOCX_UNKNOWN_NOTE_ID', message: `footnote id ${record['footnote']} is not declared` });
  }
  if (typeof record['endnote'] === 'number' && !endnoteIds.has(record['endnote'])) {
    throw new BadRequestException({ code: 'DOCX_UNKNOWN_NOTE_ID', message: `endnote id ${record['endnote']} is not declared` });
  }
  if (record['type'] === 'commentRef' && typeof record['id'] === 'number' && !commentIds.has(record['id'])) {
    throw new BadRequestException({ code: 'DOCX_UNKNOWN_COMMENT_ID', message: `comment id ${record['id']} is not declared` });
  }
};

/** DOCX feature service. */
@Injectable()
export class DocxService {
  constructor(
    private readonly cls: NormalizedClsService,
    private readonly workerService: WorkerService,
  ) {}

  /**
   * Builds a .docx from the payload in a worker thread and returns the bytes.
   * Buffers before returning so a worker failure answers 500, never a truncated 201.
   * The cache key is the payload hash, so repeated builds are served from the document cache.
   * @param body - Validated build payload.
   * @returns The .docx bytes.
   */
  async build(body: DocxBuildType): Promise<Buffer> {
    assertBuildPayload(body);
    this.cls.cacheKey().set(superjson.stringify(body));
    const stream = await this.workerService.createWorker(workerPath('./worker/index.js', import.meta.url), {
      workerData: { operation: 'build', payload: body },
    });
    return bufferStream(stream as Readable, environment.CLAMAV_MAX_BYTES);
  }

  /**
   * Extracts text and structure from an uploaded .docx.
   * @returns The parsed metadata, structure summary and full body text.
   */
  async extract() {
    const buffer = await readBody(this.cls);
    await assertDocxSignature(buffer);
    const parts = readPartsCapped(buffer, { maxTotalUncompressed: 64 * 1024 * 1024 });
    const documentXml = OoxmlReader.partText(parts, 'word/document.xml');
    if (documentXml === undefined) {
      throw new BadRequestException({ code: 'DOCX_NOT_A_DOCUMENT', message: 'word/document.xml is missing' });
    }
    const relationships = collectRelationships(
      OoxmlReader.partText(parts, 'word/_rels/document.xml.rels'),
    );
    const { headings, hyperlinks, images, lists, tables, text } = extractDocumentXml(
      documentXml,
      relationships,
    );
    return {
      format: 'docx',
      metadata: parseOoxmlMetadata(parts),
      structure: { headings, hyperlinks, images, lists, tables },
      text,
    };
  }

  /**
   * Normalized OOXML metadata for an uploaded .docx.
   * @returns Format plus the parsed properties.
   */
  async metadata() {
    const buffer = await readBody(this.cls);
    await assertDocxSignature(buffer);
    const parts = readPartsCapped(buffer, { maxTotalUncompressed: 64 * 1024 * 1024 });
    return { format: 'docx', ...parseOoxmlMetadata(parts) };
  }
}
