import { z } from 'zod';

import { MuxerFormatSchema } from '@/constants/av-formats.js';
import { SourceSchema } from '@/schema.js';

export const VideoProcessorSchema = SourceSchema.extend({
  format: MuxerFormatSchema.optional(),
});

export type VideoProcessorType = z.infer<typeof VideoProcessorSchema>;