import { z } from 'zod';

const EnvironmentSchema = z.object({
  AUTH_PASSWORD: z.string().trim().optional(),
  AUTH_USERNAME: z.string().trim().optional(),

  CORS_ORIGIN: z.array(z.url().trim()).optional(),
  FILE_HASH_HEADER_SIZE: z.coerce.number().int().positive().catch(65536), // 64 KB

  NODE_ENV: z.enum(['development', 'production']),

  TESSERACT_POOL_SIZE: z.coerce.number().int().min(1).max(8).catch(2),
  TESSERACT_PRELOAD: z.string().trim().default('eng'),
  TESSERACT_RECYCLE_JOBS: z.coerce.number().int().positive().catch(500),
  TESSERACT_TIMEOUT_MS: z.coerce.number().int().positive().catch(60000),
});

export const environment = EnvironmentSchema.parse(process.env);

export const isProduction = environment.NODE_ENV === 'production';
