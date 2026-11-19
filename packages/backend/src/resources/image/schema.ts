import type { FitEnum, FormatEnum, KernelEnum } from 'sharp';

import sharp from 'sharp';
import { z } from 'zod';

import { SourceSchema } from '@/schema.js';
import { trimmed } from '@/utils/zod.js';

const formatKeys = Object.keys(sharp.format) as Array<keyof FormatEnum>;
const fitKeys = Object.keys(sharp.fit) as Array<keyof FitEnum>;
const kernelKeys = Object.keys(sharp.kernel) as Array<keyof KernelEnum>;
/** resize position accepts sharp's corner/edge names plus everything in sharp.gravity. */
const positionKeys = [
  'top', 'right', 'bottom', 'left',
  'left top', 'right top', 'left bottom', 'right bottom',
  ...Object.keys(sharp.gravity),
] as const;

const color = z.string().regex(/^#[0-9a-f]{6}$/i);

export const ImageProcessorSchema = SourceSchema.partial().extend({
  background: color.optional(),
  blur: z.coerce.number().int().positive().optional(),
  fit: z.enum(fitKeys).optional(),
  flip: z.stringbool().optional(),
  flop: z.stringbool().optional(),
  format: z.enum(formatKeys).optional(),
  greyscale: z.stringbool().optional(),
  height: z.coerce.number().int().positive().optional(),
  kernel: z.enum(kernelKeys).optional(),
  median: z.coerce.number().int().positive().optional(),
  negate: z.stringbool().optional(),
  normalize: z.stringbool().optional(),
  position: z.enum(positionKeys).optional(),
  quality: z.coerce.number().int().positive().optional(),
  rotate: z.coerce.number().int().optional(),
  sharpen: z.coerce.number().int().positive().optional(),
  threshold: z.coerce.number().int().positive().optional(),
  tint: color.optional(),
  trim: z.stringbool().optional(),
  width: z.coerce.number().int().positive().optional(),
  withoutEnlargement: z.stringbool().optional(),
  withoutReduction: z.stringbool().optional(),
});

export type ImageProcessorType = z.infer<typeof ImageProcessorSchema>;

/**
 * Case-insensitive language code pattern: a three-letter ISO 639-2 code
 * optionally followed by a script suffix (`_latn`, `_cyrl`, ...). Codes are
 * combined with `+` or `,` (up to four). `+` only reaches this endpoint
 * URL-encoded (`%2B`), because query-string decoders treat a raw `+` as a space.
 */
// eslint-disable-next-line security/detect-unsafe-regex
const LANG_REGEX = /^[a-z]{3}(?:_[a-z]{3,4})?([+,][a-z]{3}(?:_[a-z]{3,4})?){0,3}$/i;

/**
 * Query schema for the `/image/ocr` endpoint.
 */
export const OcrSchema = SourceSchema.partial().extend({
  lang: trimmed(z.string().regex(LANG_REGEX, 'Invalid language code')).optional(),
});

export type OcrType = z.infer<typeof OcrSchema>;