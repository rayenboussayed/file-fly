import { z } from 'zod';

import { SourceSchema } from '@/schema.js';
import { STREAMABLE_OUTPUT_FORMATS } from '@/utils/capabilities.js';
import { trimmed } from '@/utils/zod.js';

const trim = z.coerce.number().finite().min(0).max(24 * 60 * 60);

export const AudioProcessorSchema = SourceSchema.partial().extend({
  bitrate: trimmed(z.enum(['96k', '128k', '192k', '256k', '320k'])).optional(),
  channels: trimmed(z.enum(['1', '2'])).optional(),
  codec: trimmed(z.enum(['aac', 'flac', 'mp3', 'opus', 'pcm'])).optional(),
  compress: trimmed(z.stringbool()).default(false),
  denoise: trimmed(z.stringbool()).default(false),
  fadeIn: z.coerce.number().min(0).max(30).optional(),
  fadeOut: z.coerce.number().min(0).max(30).optional(),
  format: trimmed(z.enum(STREAMABLE_OUTPUT_FORMATS)).default('mp3'),
  gain: z.coerce.number().min(-20).max(20).optional(),
  normalize: trimmed(z.stringbool()).default(false),
  sampleRate: trimmed(
    z.enum(['8000', '16000', '22050', '24000', '44100', '48000']),
  ).optional(),
  speed: z.coerce.number().min(0.5).max(2).optional(),
  trimEnd: trim.optional(),
  trimStart: trim.optional(),
});

export type AudioProcessorType = z.infer<typeof AudioProcessorSchema>;