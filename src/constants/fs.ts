import path from 'node:path';

/**
 *
 * @param name
 * @param fallback
 */
function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export const CACHE_DIR = process.env.CACHE_DIR ?? path.resolve('cache');
/** Entries not used for this long are evicted. */
export const CACHE_TTL_MS = numberFromEnv(
  'CACHE_TTL_MS',
  24 * 60 * 60 * 1000,
);
/** Soft cap for the whole cache dir; oldest-used entries are evicted first. */
export const CACHE_MAX_BYTES = numberFromEnv('CACHE_MAX_BYTES', 2 * 1024 ** 3);
export const CACHE_SWEEP_INTERVAL_MS = numberFromEnv(
  'CACHE_SWEEP_INTERVAL_MS',
  10 * 60 * 1000,
);
/** Orphaned *.tmp files (crashed writers) older than this are removed. */
export const CACHE_TMP_MAX_AGE_MS = numberFromEnv(
  'CACHE_TMP_MAX_AGE_MS',
  60 * 60 * 1000,
);