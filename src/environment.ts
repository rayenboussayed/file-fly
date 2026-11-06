import { z } from 'zod';

const EnvironmentSchema = z.object({
  AUTH_PASSWORD: z.string().trim().optional(),
  AUTH_USERNAME: z.string().trim().optional(),

  CORS_ORIGIN: z.array(z.url().trim()).optional(),
  FILE_HASH_HEADER_SIZE: z.coerce.number().int().positive().catch(65536), // 64 KB

  NODE_ENV: z.enum(['development', 'production']),
});

export const environment = EnvironmentSchema.parse(process.env);

export const isProduction = environment.NODE_ENV === 'production';
