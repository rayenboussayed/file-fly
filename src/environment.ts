import { z } from 'zod';

const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']),
  CORS_ORIGIN: z.array(z.url().trim()).optional(),

  AUTH_USERNAME: z.string().trim().optional(),
  AUTH_PASSWORD: z.string().trim().optional(),
});

export const environment = EnvironmentSchema.parse(process.env);

export const isProduction = environment.NODE_ENV === 'production';
export const isDevelopment = environment.NODE_ENV === 'development';
