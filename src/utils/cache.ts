import { djb2 } from 'jutilities/hash';
import { superjson } from 'jutilities/json';

/**
 * Hashes an arbitrary value into a deterministic, filesystem-safe cache key.
 * @param options Description.
 * @returns Result.
 */
export function generateCacheKey(options: unknown) {
  return djb2(superjson.stringify(options)).toString();
}
