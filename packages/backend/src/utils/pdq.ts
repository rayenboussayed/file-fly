import type { PDQ as PdqClass } from 'pdq-wasm';

import { lazy } from 'jutilities/lazy';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);

/** Initialized PDQ perceptual-hash class from the `pdq-wasm` package. */
export type PdqType = typeof PdqClass;

/**
 * Loads and initializes the PDQ perceptual-hash class, caching it for reuse.
 *
 * This function takes no parameters.
 *
 * The `pdq-wasm` ESM entry (`dist/esm/index.js`) cannot locate its `.wasm`
 * file under Node, so the working CommonJS entry is loaded on purpose with
 * `createRequire(import.meta.url)('pdq-wasm')` instead of a static ESM import.
 * The first call requires the package and awaits `PDQ.init()`; concurrent
 * first calls share a single in-flight initialization promise, and later
 * calls return the cached class. The memoized entry is dropped if
 * initialization rejects, so a failed attempt is retried on the next call.
 * @returns The initialized `PDQ` class.
 */
export const loadPdq = lazy(async (): Promise<PdqType> => {
  const { PDQ: Fresh }: { PDQ: PdqType } = require_('pdq-wasm');
  await Fresh.init();
  return Fresh;
});
