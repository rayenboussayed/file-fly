import { z } from 'zod';

import { SourceSchema } from '@/schema.js';
import { STREAMABLE_OUTPUT_FORMATS } from '@/utils/capabilities.js';
import { trimmed } from '@/utils/zod.js';

import { AudioProcessorSchema } from '../audio/schema.js';

const seconds = z.coerce
  .number()
  .finite()
  .min(0)
  .max(24 * 60 * 60);

/**
Query parameters for `/video/processor`, `/video/metadata`, `/video/dna` and `/video/stats` uploads.
 */
export const VideoProcessorSchema = SourceSchema.partial().extend({
  audioBitrate: trimmed(z.enum(['96k', '128k', '192k', '256k'])).optional(),
  audioChannels: trimmed(z.enum(['1', '2'])).optional(),
  audioCodec: trimmed(z.enum(['aac', 'opus'])).optional(),
  audioNormalize: trimmed(z.stringbool()).default(false),
  audioSampleRate: trimmed(
    z.enum(['16000', '24000', '44100', '48000']),
  ).optional(),
  bitrate: trimmed(
    z.enum(['512k', '1M', '2M', '5M', '10M', '20M', '50M']),
  ).optional(),
  codec: trimmed(z.enum(['h264', 'vp9', 'av1'])).optional(),
  crf: z.coerce.number().int().min(0).max(51).optional(),
  deinterlace: trimmed(z.stringbool()).default(false),
  denoise: trimmed(z.stringbool()).default(false),
  flip: trimmed(z.stringbool()).default(false),
  flop: trimmed(z.stringbool()).default(false),
  format: trimmed(z.enum(STREAMABLE_OUTPUT_FORMATS)).default('mp4'),
  fps: z.coerce.number().min(1).max(120).optional(),
  grayscale: trimmed(z.stringbool()).default(false),
  height: z.coerce.number().int().min(16).max(3840).optional(),
  normalize: trimmed(z.stringbool()).default(false),
  preset: trimmed(z.enum(['ultrafast', 'fast', 'medium'])).optional(),
  rotate: trimmed(z.enum(['90', '180', '270'])).optional(),
  sharpen: trimmed(z.stringbool()).default(false),
  trimEnd: seconds.optional(),
  trimStart: seconds.optional(),
  width: z.coerce.number().int().min(16).max(7680).optional(),
});

/**
Validated options for the video processor routes.
 */
export type VideoProcessorType = z.infer<typeof VideoProcessorSchema>;

// eslint-disable-next-line security/detect-unsafe-regex
const FRAME_REGEX = /^\d+(?:\.\d+)?(?:,\d+(?:\.\d+)?)*$/;

/**
Query parameters for `POST /video/screenshot` (extracted JPEG frames as multipart).
 */
export const ScreenshotSchema = SourceSchema.partial().extend({
  frames: trimmed(z.string().regex(FRAME_REGEX, 'Invalid frames format')),
});

/**
Validated options for `/video/screenshot`.
 */
export type ScreenshotType = z.infer<typeof ScreenshotSchema>;

/**
 * Parse a comma-separated list of frame timestamps into a deduplicated,
 * validated, sorted, and capped array of seconds.
 * @param raw Raw comma-separated frame string.
 * @returns Sorted unique frame timestamps in seconds.
 */
export function parseFrames(raw: string): number[] {
  const parts = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return parts.length === 0 ? [] : [...new Set(parts.map(Number))]
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 86_400)
    .toSorted((a, b) => a - b)
    .slice(0, 50);
} /**
   * Query parameters for `/video/audio` (audio extraction from a video upload).
   *
   * Reuses the audio processor options except `codec`, which is derived from
   * `format` so an incompatible encoder/muxer pair can never be requested.
   * `format` defaults to `mp3`.
   */
export const VideoAudioSchema = AudioProcessorSchema.omit({
  codec: true,
  trimEnd: true,
  trimStart: true,
});

/**
Validated options for `/video/audio`.
 */
export type VideoAudioType = z.infer<typeof VideoAudioSchema>;
