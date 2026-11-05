import type { FitEnum, FormatEnum, KernelEnum } from 'sharp';

import sharp from 'sharp';
import { z } from 'zod';

import { SourceSchema } from '@/schema.js';

const formatKeys = Object.keys(sharp.format) as Array<keyof FormatEnum>;
const fitKeys = Object.keys(sharp.fit) as Array<keyof FitEnum>;
const kernelKeys = Object.keys(sharp.kernel) as Array<keyof KernelEnum>;

const color = z.string().regex(/^#[0-9a-f]{6}$/i);

export const ImageProcessorSchema = SourceSchema.extend({
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
  position: z.enum(kernelKeys).optional(),
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