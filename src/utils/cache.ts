import { superjson } from 'jutilities/json';

import { sha512 } from './hash.js';

/**
 *
 * @param options Description.
 * @returns Result.
 */
export function generateCacheKey(options: unknown) {
  return sha512.buffer(superjson.stringify(options)).toString('base64');
}
