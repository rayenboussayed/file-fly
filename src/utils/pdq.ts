import type { PDQ as PdqClass } from 'pdq-wasm';

import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);

/** Initialized PDQ perceptual-hash class from the `pdq-wasm` package. */
export type PdqType = typeof PdqClass;

let cached: PdqType | undefined;
let inflight: Promise<PdqType> | undefined;

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
 * calls return the cached class.
 * @returns The initialized `PDQ` class.
 */
export async function loadPdq(): Promise<PdqType> {
  if (cached !== undefined) {
    return cached;
  }
  inflight ??= (async (): Promise<PdqType> => {
    const { PDQ: Fresh }: { PDQ: PdqType } = require_('pdq-wasm');
    await Fresh.init();
    cached = Fresh;
    return Fresh;
  })();
  try {
    return await inflight;
  } finally {
    inflight = undefined;
  }
}
