import { z } from 'zod';

import { SourceSchema } from '@/schema.js';

export const VideoProcessorSchema = SourceSchema.extend({
  format: z.enum(['mp4', 'mov', 'mkv', 'webm']).optional(),
});

export type VideoProcessorType = z.infer<typeof VideoProcessorSchema>;