import { z } from 'zod';

import { SourceSchema } from '@/schema.js';

export const VideoProcessorSchema = SourceSchema.extend({
  audioBitrate: z.string().trim().min(1).optional(),
  audioCodec: z.string().trim().min(1).optional(),
  format: z.string().trim().min(1).optional(),
  fps: z.coerce.number().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
  videoBitrate: z.string().trim().min(1).optional(),
  videoCodec: z.string().trim().min(1).optional(),
  width: z.coerce.number().int().positive().optional(),
});

export type VideoProcessorType = z.infer<typeof VideoProcessorSchema>;