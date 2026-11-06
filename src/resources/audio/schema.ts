import { z } from 'zod';

import { MuxerFormatSchema } from '@/constants/av-formats.js';
import { SourceSchema } from '@/schema.js';

export const AudioProcessorSchema = SourceSchema.extend({
  format: MuxerFormatSchema.optional(),
});

export type AudioProcessorType = z.infer<typeof AudioProcessorSchema>;