import path from 'node:path';
import { z } from 'zod';

/** Absolute default cache root, used when `CACHE_DIR` is unset or blank. */
const DEFAULT_CACHE_DIR = path.resolve('cache');
/** Absolute default metrics root, used when `METRICS_DIR` is unset or blank. */
const DEFAULT_METRICS_DIR = path.resolve('metrics');
/** Default static root for the dashboard build output, used when `DASHBOARD_DIR` is unset or blank. */
const DEFAULT_DASHBOARD_DIR = path.resolve('packages/dashboard/dist');

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
    /** Basic-auth credentials; enforced only when BOTH are set (both-or-neither). */
    AUTH_PASSWORD: z.string().trim().optional(),
    /** Basic-auth credentials; enforced only when BOTH are set (both-or-neither). */
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

    /** Allowed origins in production; comma-separated URLs (a bare string is accepted as a single origin). */
    CORS_ORIGIN: z.preprocess(
      (value) => {
        if (typeof value !== 'string') return value;
        const origins = value.split(',').map((part) => part.trim()).filter((part) => part.length > 0);
        return origins.length === 0 ? undefined : origins;
      },
      z.array(z.url().trim()).optional(),
    ),

    /** Static root for the dashboard build (`packages/dashboard/dist`); missing dir = dashboard not served. */
    DASHBOARD_DIR: z.string().trim().min(1).catch(DEFAULT_DASHBOARD_DIR),
    /** Comma-separated bare hostnames the `source=` media download may fetch (dotted suffixes allowed for subdomains); unset = only the built-in scheme and private-literal rules apply. */
    EGRESS_ALLOWLIST: z.preprocess(
      (value) => {
        if (typeof value !== 'string') return value;
        const entries = value.split(',').map((part) => part.trim().toLowerCase()).filter((part) => part.length > 0);
        return entries.length === 0 ? undefined : entries;
      },
      z.array(z.string().trim().min(1).max(253)).optional(),
    ),

    FILE_HASH_HEADER_SIZE: z.coerce.number().int().positive().catch(65536), // 64 KB
    /** pino log level; unset (or blank) = `info` in production, `debug` otherwise. Invalid values are rejected at boot. */
    LOG_LEVEL: z.preprocess(
      (value) =>
        typeof value === 'string' && value.trim().length === 0 ? undefined : value,
      z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
    ),
    /** Directory holding `metrics.db`; created at startup. Kept out of `CACHE_DIR` on purpose. */
    METRICS_DIR: z.string().trim().min(1).catch(DEFAULT_METRICS_DIR),
    /** Flush interval for the in-memory metric deltas; invalid values fall back to 1s (0 is not accepted here). */
    METRICS_FLUSH_INTERVAL_MS: numericFromEnv(1000),
    /** Retention for the metrics tables; invalid values fall back to 35 days. */
    METRICS_RETENTION_DAYS: numericFromEnv(35),
    /** Bearer token for `GET /metrics`; production refuses requests without it. Unset in development = open. */
    METRICS_TOKEN: z.string().trim().min(1).optional().catch(undefined),

    NODE_ENV: z.enum(['development', 'production']),

    /** Language data for tesseract.js; defaults to `<CACHE_DIR>/tesseract`. */
    TESSERACT_DIR: z.string().trim().min(1).optional().catch(undefined),
    TESSERACT_POOL_SIZE: z.coerce.number().int().min(1).max(8).catch(2),
    TESSERACT_PRELOAD: z.string().trim().default('eng'),
    TESSERACT_RECYCLE_JOBS: z.coerce.number().int().positive().catch(500),
    TESSERACT_TIMEOUT_MS: z.coerce.number().int().positive().catch(60000),
    /** Honor `X-Forwarded-For` for `request.ip` (set only behind a trusted proxy). */
    TRUST_PROXY: z.stringbool().optional().catch(undefined),
  })
  .superRefine((env, ctx) => {
    // Empty strings count as unset (trimmed by the schema already).
    const hasUser = env.AUTH_USERNAME !== undefined && env.AUTH_USERNAME.length > 0;
    const hasPassword = env.AUTH_PASSWORD !== undefined && env.AUTH_PASSWORD.length > 0;
    if (hasUser !== hasPassword) {
      ctx.addIssue({
        code: 'custom',
        message:
          'AUTH_USERNAME and AUTH_PASSWORD must be set together (basic auth is enabled only when both are set)',
        path: [hasUser ? 'AUTH_PASSWORD' : 'AUTH_USERNAME'],
      });
    }
  })
  .transform((env) => ({
    ...env,
    TESSERACT_DIR:
      env.TESSERACT_DIR ?? path.join(env.CACHE_DIR, 'tesseract'),
  }));

/** Validated process environment; parsed once at import time (fail-fast on invalid values). */
export const environment = EnvironmentSchema.parse(process.env);

/** True when `NODE_ENV=production`. */
export const isProduction = environment.NODE_ENV === 'production';
