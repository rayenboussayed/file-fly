import { z } from 'zod';

import { SourceSchema } from '@/schema.js';
import { trimmed } from '@/utils/zod.js';

/**
 * Strict, case-insensitive language code pattern.
 *
 * Three-letter ISO 639-2 code, optionally followed by a script suffix
 * (`_latn`, `_cyrl`, ...), combined with up to three additional codes via `+`.
 */
// eslint-disable-next-line security/detect-unsafe-regex
const LANG_REGEX = /^[a-z]{3}(?:_[a-z]{3,4})?(\+[a-z]{3}(?:_[a-z]{3,4})?){0,3}$/i;

/**
 * Query schema for the `/ocr` endpoint.
 */
export const OcrSchema = SourceSchema.partial().extend({
  lang: trimmed(z.string().regex(LANG_REGEX, 'Invalid language code')).optional(),
});

export type OcrType = z.infer<typeof OcrSchema>;