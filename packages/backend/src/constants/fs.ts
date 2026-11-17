import fs from 'node:fs';

import { environment } from '@/environment.js';

/** Cache root (absolute); processed media output and the undici cache live here. */
export const CACHE_DIR = environment.CACHE_DIR;
// The cache directory is required at startup (undici cache store): create it up front.
// eslint-disable-next-line security/detect-non-literal-fs-filename
fs.mkdirSync(CACHE_DIR, { recursive: true });
/** Entries not used for this long are evicted. */
export const CACHE_TTL_MS = environment.CACHE_TTL_MS;
/** Soft cap for the whole cache dir; oldest-used entries are evicted first. */
export const CACHE_MAX_BYTES = environment.CACHE_MAX_BYTES;
/** How often the cache janitor sweeps. */
export const CACHE_SWEEP_INTERVAL_MS = environment.CACHE_SWEEP_INTERVAL_MS;
/** Orphaned *.tmp files (crashed writers) older than this are removed. */
export const CACHE_TMP_MAX_AGE_MS = environment.CACHE_TMP_MAX_AGE_MS;
/** Directory where tesseract.js stores its (gzipped) language data. */
export const TESSERACT_DIR = environment.TESSERACT_DIR;
