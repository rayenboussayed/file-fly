import { z } from 'zod';

import { SourceSchema } from '@/schema.js';

export const AudioProcessorSchema = SourceSchema.extend({
  format: z.enum(['aac', 'flac', 'mp3', 'ogg', 'wav']).optional(),
});

export type AudioProcessorType = z.infer<typeof AudioProcessorSchema>;