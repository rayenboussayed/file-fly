import { z } from 'zod';

import { trimmed } from '@/utils/zod.js';

/** Plain mimes (no macro/executable fonts); file-type detects all of these. */
export const FONT_MIMES = [
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
  'font/collection',
] as const;

const FONT_MIME_SET = new Set<string>(FONT_MIMES);

/**
 * Whether the mime is a supported font container.
 * @param mime - The lowercased content-type mime.
 * @returns True for the five supported container mimes.
 */
export const isFontMime = (mime: string): boolean => FONT_MIME_SET.has(mime);

/** Flat query parameters for `POST /font/metadata`. */
export const FontMetaSchema = z
  .object({
    /** Collection member to select by PostScript name; defaults to the first. */
    font: trimmed(z.string().min(1).max(100)).optional(),
  })
  .strict();
/** Query parameters for `POST /font/metadata`. */
export type FontMetaType = z.infer<typeof FontMetaSchema>;

/** Flat query parameters for `POST /font/extract`. */
export const FontExtractSchema = z
  .object({
    /** Collection member to select by PostScript name; defaults to the first. */
    font: trimmed(z.string().min(1).max(100)).optional(),
    /** Maximum glyph records to return (default: all). */
    limit: z.coerce.number().int().min(1).max(10_000).optional(),
  })
  .strict();
/** Query parameters for `POST /font/extract`. */
export type FontExtractType = z.infer<typeof FontExtractSchema>;

/** Flat query parameters for `POST /font/shape`. */
export const FontShapeSchema = z.object({
  /** Direction override; defaults to the script default. */
  direction: z.enum(['ltr', 'rtl', 'auto']).optional(),
  /** Comma-separated feature tags to enable or disable with a leading '-' (e.g. 'liga,-dlig,kern'). */
  features: trimmed(z.string().max(200)).optional(),
  /** Collection member to select by PostScript name; defaults to the first. */
  font: trimmed(z.string().min(1).max(100)).optional(),
  /** Language override (e.g. en); defaults to the script default. */
  language: trimmed(z.string().min(2).max(16)).optional(),
  /** Script override (e.g. Latn); defaults to the shaper's detection. */
  script: trimmed(z.string().min(2).max(8)).optional(),
  /** The text to shape (max 500 chars). */
  text: trimmed(z.string().min(1).max(500)),
});
export type FontShapeType = z.infer<typeof FontShapeSchema>;

/** Flat query parameters for `POST /font/subset`. */
export const FontSubsetSchema = z.object({
  /** Collection member to select by PostScript name; defaults to the first. */
  font: trimmed(z.string().min(1).max(100)).optional(),
  /** The text to include in the subset (max 10 000 chars). */
  text: trimmed(z.string().min(1).max(10_000)),
});
export type FontSubsetType = z.infer<typeof FontSubsetSchema>;
