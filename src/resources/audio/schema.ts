import { z } from 'zod';

import { SourceSchema } from '@/schema.js';

export const AudioProcessorSchema = SourceSchema.extend({
  audioBitrate: z.string().trim().min(1).optional(),
  audioCodec: z.string().trim().min(1).optional(),
  channels: z.coerce.number().int().positive().optional(),
  format: z.string().trim().min(1).optional(),
  sampleRate: z.coerce.number().int().positive().optional(),
});

export type AudioProcessorType = z.infer<typeof AudioProcessorSchema>;