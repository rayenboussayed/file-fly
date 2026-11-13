import fs from 'node:fs';
import path from 'node:path';

/**
 *
 * @param name Description.
 * @param fallback Description.
 * @returns Result.
 */
function numberFromEnv(name: string, fallback: number): number {
  /* eslint-disable-next-line security/detect-object-injection */
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export const CACHE_DIR = process.env.CACHE_DIR ?? path.resolve('cache');
// The cache directory is required at startup (undici cache store): create it up front.
// eslint-disable-next-line security/detect-non-literal-fs-filename
fs.mkdirSync(CACHE_DIR, { recursive: true });
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
/** Directory where tesseract.js stores its (gzipped) language data. */
export const TESSERACT_DIR =
  process.env.TESSERACT_DIR ?? path.join(CACHE_DIR, 'tesseract');