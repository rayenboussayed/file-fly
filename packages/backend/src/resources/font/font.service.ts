import {
  BadRequestException,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import * as fontkit from 'fontkit';

import { environment } from '@/environment.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { bufferStream } from '@/utils/buffer.js';
import { openMediaSource } from '@/utils/open-source.js';

import { isFontMime } from './schema.js';

/**
 * Only font container mimes; macro/executable payloads are rejected at the boundary.
 * @param cls - Normalized request context.
 * @returns The body bytes, capped.
 */
const readBody = async (cls: NormalizedClsService): Promise<Buffer> => {
  const contentType = String(cls.request()?.headers?.['content-type'] ?? '');
  const mime = contentType.split(';', 1)[0]?.trim() ?? ''; // split always yields a first element; the ?? '' is for the type system
  if (!isFontMime(mime) && mime !== 'application/octet-stream') {
    throw new UnsupportedMediaTypeException(`Unsupported media type "${mime}" for font input`);
  }
  await openMediaSource(cls);
  const stream = cls.sourceStream().get();
  if (!stream) {
    throw new BadRequestException({ code: 'FONT_NO_SOURCE', message: 'font body is missing' });
  }
  return bufferStream(stream, environment.CLAMAV_MAX_BYTES);
};

/**
 * Signature must be a font container; closes the renamed-image and non-font holes.
 * @param buffer - The buffered upload.
 */
const assertFontSignature = async (buffer: Buffer): Promise<void> => {
  const signature = await fileTypeFromBuffer(buffer);
  if (signature === undefined || !isFontMime(signature.mime)) {
    throw new UnsupportedMediaTypeException('Uploaded bytes are not a font');
  }
};

// Fontkit 3.0.0 tags every opened font with `.type`; collections carry 'TTC'/'DFont'.
const isCollection = (value: unknown): value is fontkit.FontCollection =>
  typeof value === 'object' && value !== null && (value as fontkit.FontCollection).type === 'TTC'
  || (typeof value === 'object' && value !== null && (value as fontkit.FontCollection).type === 'DFont');

// A font is CFF-based when its directory carries a 'CFF ' table.
const isCffFont = (font: fontkit.Font): boolean => {
  const directory = (font as unknown as { directory?: { tables?: Record<string, unknown> } }).directory;
  return directory !== undefined && directory.tables !== undefined && 'CFF ' in directory.tables;
};

const openFont = (
  buffer: Buffer,
  member: string | undefined,
): { collection: string[]; font: fontkit.Font; format: string } => {
  let opened: fontkit.Font | fontkit.FontCollection;
  try {
    // Always open without a member first so collections are detected; fontkit
    // returns the single font directly for standalone files.
    opened = fontkit.create(buffer);
  } catch {
    throw new BadRequestException({ code: 'FONT_UNREADABLE', message: 'the uploaded bytes are not a readable font' });
  }
  if (isCollection(opened)) {
    // Materialize decoding once: every access would otherwise re-decode member directories.
    const fonts = opened.fonts;
    // Only selectable (PostScript-named) members are listed and accepted.
    const members = fonts.map((font) => font.postscriptName).filter((name): name is string => typeof name === 'string');
    const first = fonts[0];
    if (first === undefined && member === undefined) {
      // An empty collection is not a usable font.
      throw new BadRequestException({
        code: 'FONT_UNREADABLE',
        message: 'the collection contains no readable fonts',
      });
    }
    const selected = member === undefined
      ? first
      : fonts.find((candidate) => candidate.postscriptName === member) ?? null;
    if (selected === null || selected === undefined) {
      throw new BadRequestException({
        code: 'FONT_UNKNOWN_MEMBER',
        message: `collection member "${member}" not found (members: ${members.join(', ')})`,
      });
    }
    return { collection: members, font: selected, format: 'collection' };
  }
  if (member !== undefined) {
    throw new BadRequestException({
      code: 'FONT_UNKNOWN_MEMBER',
      message: `the font is not a collection; member "${member}" does not exist`,
    });
  }
  return { collection: [], font: opened, format: signatureFormat(buffer) };
};

/**
 * Maps the file's magic bytes to a short format tag.
 * @param buffer - The buffered upload.
 * @returns The format tag (ttf, otf, woff, woff2).
 */
export const signatureFormat = (buffer: Buffer): string => {
  // The signature gate already let this through; default to ttf (glyf or CFF in an sfnt).
  const magic = buffer.subarray(0, 4).toString('latin1');
  if (magic === 'wOFF') return 'woff';
  if (magic === 'wOF2') return 'woff2';
  if (magic === 'OTTO') return 'otf';
  return 'ttf';
};

const embeddingOf = (os2: fontkit.Font['OS/2'] | undefined) => {
  if (os2 === undefined) {
    // Cannot read fsType without an OS/2 table; treat as non-embeddable silence-zero fallback.
    throw new BadRequestException({ code: 'FONT_UNREADABLE', message: 'the font has no readable OS/2 table' });
  }
  const fsType = os2.fsType;
  return {
    bitmapOnly: fsType.bitmapOnly,
    editable: fsType.editable,
    noEmbedding: fsType.noEmbedding,
    noSubsetting: fsType.noSubsetting,
    viewOnly: fsType.viewOnly,
  };
};

const metadataOf = (font: fontkit.Font, format: string, collection: string[]) => ({
  ascent: font.ascent,
  availableFeatures: font.availableFeatures,
  bbox: font.bbox,
  capHeight: font.capHeight,
  characterSetSize: font.characterSet.length,
  collection,
  copyright: font.copyright,
  descent: font.descent,
  embedding: embeddingOf(font['OS/2']),
  familyName: font.familyName,
  format,
  fullName: font.fullName,
  italicAngle: font.italicAngle,
  license: font.getName('license', 'en'),
  licenseURL: font.getName('licenseURL', 'en'),
  lineGap: font.lineGap,
  // fontkit exposes the named instances at runtime but @types/fontkit omits the getter.
  namedVariations:
    // @types/fontkit omits the getter; fontkit 3.0.0 always provides it (returns {} for non-variable fonts)
    (font as unknown as { namedVariations?: Record<string, unknown> }).namedVariations ?? {},
  numGlyphs: font.numGlyphs,
  postscriptName: font.postscriptName,
  subfamilyName: font.subfamilyName,
  underlinePosition: font.underlinePosition,
  underlineThickness: font.underlineThickness,
  unitsPerEm: font.unitsPerEm,
  variationAxes: font.variationAxes,
  version: font.version,
  weightClass: font['OS/2'].usWeightClass,
  xHeight: font.xHeight,
});

/** Font feature service: parses sfnt containers (metadata, extraction, shaping, subsetting). */
@Injectable()
export class FontService {
  constructor(private readonly cls: NormalizedClsService) {}

  /**
   * Extracts every glyph's coverage and identity plus the supported OpenType features.
   * @param query - The validated query object.
   * @param query.font - Optional collection member to select by PostScript name.
   * @param query.limit - Optional cap on the number of returned glyph records.
   * @returns The extraction document (could be large for CJK fonts).
   */
  async extract(query: { font?: string; limit?: number }) {
    const buffer = await readBody(this.cls);
    await assertFontSignature(buffer);
    const { collection, font, format } = openFont(buffer, query.font);
    try {
      // getGlyph() does not back-map code points; invert the cmap once instead.
      const codePointsOf = new Map<number, number[]>();
      for (const cp of font.characterSet) {
        const glyph = font.glyphForCodePoint(cp);
        const list = codePointsOf.get(glyph.id);
        if (list) list.push(cp);
        else codePointsOf.set(glyph.id, [cp]);
      }
      const count = font.numGlyphs;
      // Default to 10 000 glyphs so an unread query cannot serialize 65k records; explicit `limit` wins.
      const ceiling = query.limit ?? Math.min(count, 10_000);
      const out: Array<Record<string, unknown>> = [];
      for (let id = 0; id < Math.min(count, ceiling); id += 1) {
        const glyph = font.getGlyph(id);
        out.push({
          advanceWidth: glyph.advanceWidth,
          bbox: glyph.bbox,
          codePoints: codePointsOf.get(glyph.id) ?? [],
          id: glyph.id,
          isLigature: glyph.isLigature,
          isMark: glyph.isMark,
          name: glyph.name,
        });
      }
      return {
        availableFeatures: font.availableFeatures,
        collection,
        familyName: font.familyName,
        format,
        glyphs: out,
        numGlyphs: count,
        postscriptName: font.postscriptName,
        returnedGlyphs: out.length,
      };
    } catch {
      throw new BadRequestException({ code: 'FONT_UNREADABLE', message: 'the font directory is inconsistent' });
    }
  }

  /**
   * Reads the uploaded font (ClamAV-scanned, signature-gated) and normalizes its metadata.
   * @param query - The validated query object.
   * @param query.font - Optional collection member to select by PostScript name.
   * @returns The font metadata document.
   */
  async metadata(query: { font?: string }) {
    const buffer = await readBody(this.cls);
    await assertFontSignature(buffer);
    const { collection, font, format } = openFont(buffer, query.font);
    try {
      return metadataOf(font, format, collection);
    } catch {
      throw new BadRequestException({ code: 'FONT_UNREADABLE', message: 'font metrics are inconsistent' });
    }
  }

  /**
   * Shapes text with the font's OpenType engine.
   * @param query - The validated query object.
   * @param query.direction - Optional direction override; defaults to the script default.
   * @param query.features - Optional `+tag`/`-tag`/`tag` comma-separated feature overrides.
   * @param query.font - Optional collection member to select by PostScript name.
   * @param query.language - Optional language override; defaults to the script default.
   * @param query.script - Optional script override; defaults to detection.
   * @param query.text - The text to shape.
   * @returns The glyph run with positions and aggregate metrics.
   */
  async shape(query: {
    direction?: 'auto' | 'ltr' | 'rtl';
    features?: string;
    font?: string;
    language?: string;
    script?: string;
    text: string;
  }) {
    const buffer = await readBody(this.cls);
    await assertFontSignature(buffer);
    const { font, format } = openFont(buffer, query.font);
    const features = parseFeatures(query.features);
    try {
      const run = font.layout(
        query.text,
        features,
        query.script,
        query.language,
        query.direction === 'auto' ? undefined : query.direction,
      );
      return {
        advanceHeight: run.advanceHeight,
        advanceWidth: run.advanceWidth,
        bbox: run.bbox,
        direction: run.direction,
        features: run.features,
        format,
        glyphs: run.glyphs.map((glyph, index) => ({
          advanceWidth: glyph.advanceWidth,
          codePoints: glyph.codePoints,
          id: glyph.id,
          isLigature: glyph.isLigature,
          isMark: glyph.isMark,
          name: glyph.name,
          // `positions` is constructed by fontkit in the same order as `glyphs`.
          // eslint-disable-next-line security/detect-object-injection
          ...run.positions[index],
        })),
        language: run.language,
        script: run.script,
      };
    } catch (error) {
      throw new BadRequestException({
        code: 'FONT_SHAPE_FAILED',
        message: `shaping failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Subsets the font to the glyphs needed for the given text.
   * The output is a minimal sfnt intended for PDF embedding (no cmap); it is not
   * a standalone web font.
   * @param query - The validated query object.
   * @param query.font - Optional collection member to select by PostScript name.
   * @param query.text - The text whose glyphs are kept.
   * @returns The subsetted sfnt bytes.
   */
  async subset(query: { font?: string; text: string }) {
    const buffer = await readBody(this.cls);
    await assertFontSignature(buffer);
    const { font } = openFont(buffer, query.font);
    // A CFF-based (OTF) subset is a bare CFF blob, not a standalone sfnt: refuse it
    // rather than emit something labeled font/ttf that consumers cannot embed.
    if (isCffFont(font)) {
      throw new BadRequestException({
        code: 'FONT_SUBSET_UNSUPPORTED',
        message: 'subsetting is limited to TrueType-outline fonts; CFF-based (OTF) fonts are not supported',
      });
    }
    try {
      const subset = font.createSubset();
      const glyphs = font.glyphsForString(query.text);
      const seen = new Set<number>();
      for (const glyph of glyphs) {
        if (seen.has(glyph.id)) continue;
        seen.add(glyph.id);
        subset.includeGlyph(glyph);
      }
      return Buffer.from(subset.encode());
    } catch (error) {
      throw new BadRequestException({
        code: 'FONT_SUBSET_FAILED',
        message: `subset failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
}

const FEATURE_TAG = /^[A-Z0-9]{4}$/i;

/**
 * Parses 'liga,kern,-dlig' into a fontkit features record (enabled default, '-' disables).
 * Unknown 4-character tags pass through to the shaper (it ignores them); malformed tags are a client error.
 * @param raw - The raw feature string from the query.
 * @returns The features record, or undefined when no features were given.
 */
const parseFeatures = (raw: string | undefined): Record<string, boolean> | undefined => {
  if (!raw) return undefined;
  const entries = new Map<string, boolean>();
  for (const part of raw.split(',')) {
    const tag = part.trim();
    if (tag.length === 0) continue;
    let sign = '';
    if (tag.startsWith('-') || tag.startsWith('+')) sign = tag.slice(0, 1);
    const name = sign === '' ? tag : tag.slice(1);
    if (!FEATURE_TAG.test(name)) {
      throw new BadRequestException({
        code: 'FONT_INVALID_FEATURE',
        message: `feature tag "${name}" is not a 4-character OpenType tag`,
      });
    }
    entries.set(name, sign !== '-');
  }
  return Object.fromEntries(entries);
};
