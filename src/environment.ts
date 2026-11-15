import path from 'node:path';
import { z } from 'zod';

/** Absolute default cache root, used when `CACHE_DIR` is unset or blank. */
const DEFAULT_CACHE_DIR = path.resolve('cache');

/**
 * Numeric env var handling:
 * - blank strings (whitespace included) are treated as unset, matching `process.env.X || fallback` ergonomics
 *   (`Number('') === 0` would otherwise silently pass),
 * - non-numeric and non-positive values fall back instead of throwing.
 * @param fallback Value used when the env var is unset, blank or invalid.
 * @returns Zod schema coercing to a positive integer with the fallback applied.
 */
const numericFromEnv = (fallback: number) =>
  z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim().length === 0 ? undefined : value,
    z.coerce.number().int().positive().catch(fallback),
  );

const EnvironmentSchema = z
  .object({
    AUTH_PASSWORD: z.string().trim().optional(),
    AUTH_USERNAME: z.string().trim().optional(),

    /** Cache root; the directory is created at startup. */
    CACHE_DIR: z.string().trim().min(1).catch(DEFAULT_CACHE_DIR),
    /** Soft cap for the whole cache dir; oldest-used entries are evicted first. */
    CACHE_MAX_BYTES: numericFromEnv(2 * 1024 ** 3),
    /** How often the cache janitor sweeps. */
    CACHE_SWEEP_INTERVAL_MS: numericFromEnv(10 * 60 * 1000),
    /** Orphaned *.tmp files (crashed writers) older than this are removed. */
    CACHE_TMP_MAX_AGE_MS: numericFromEnv(60 * 60 * 1000),

    /** Entries not used for this long are evicted. */
    CACHE_TTL_MS: numericFromEnv(24 * 60 * 60 * 1000),
    /** Host of the clamd daemon; unset = virus scanning skipped with a warning. */
    CLAMAV_HOST: z.string().trim().min(1).optional(),
    /** Bodies larger than this are rejected 413 before scanning so clamd's INSTREAM size limit is never hit; raise together with clamd.conf StreamMaxLength. */
    CLAMAV_MAX_BYTES: numericFromEnv(25 * 1024 ** 2),
    /** Port of the clamd daemon; must be set together with CLAMAV_HOST. */
    CLAMAV_PORT: z.coerce.number().int().min(1).max(65535).optional(),
    /** Clamd socket connect timeout passed to clamdscan. */
    CLAMAV_TIMEOUT_MS: numericFromEnv(60000),

    CORS_ORIGIN: z.array(z.url().trim()).optional(),
    FILE_HASH_HEADER_SIZE: z.coerce.number().int().positive().catch(65536), // 64 KB

    NODE_ENV: z.enum(['development', 'production']),

    /** Language data for tesseract.js; defaults to `<CACHE_DIR>/tesseract`. */
    TESSERACT_DIR: z.string().trim().min(1).optional().catch(undefined),
    TESSERACT_POOL_SIZE: z.coerce.number().int().min(1).max(8).catch(2),
    TESSERACT_PRELOAD: z.string().trim().default('eng'),
    TESSERACT_RECYCLE_JOBS: z.coerce.number().int().positive().catch(500),
    TESSERACT_TIMEOUT_MS: z.coerce.number().int().positive().catch(60000),
  })
  .transform((env) => ({
    ...env,
    TESSERACT_DIR:
      env.TESSERACT_DIR ?? path.join(env.CACHE_DIR, 'tesseract'),
  }));

export const environment = EnvironmentSchema.parse(process.env);

export const isProduction = environment.NODE_ENV === 'production';
