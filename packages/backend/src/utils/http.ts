import type { NormalizedClsService } from '@/services/normalized-cls.service.js';

/**
 * Reads the current request's media type without parameters.
 *
 * Returns `''` when the request or the header is absent. The header is split
 * before `;` and trimmed, matching the expression each document service used
 * before this helper existed. It stays a pure function over the normalized CLS
 * context so specs that stub only `request()` keep working.
 * @param cls - Normalized request context carrying the current request.
 * @returns The lower-case-independent media type, or `''` when missing.
 */
export function requestMime(cls: NormalizedClsService): string {
  const header = String(cls.request()?.headers?.['content-type'] ?? '');
  return header.split(';', 1)[0]?.trim() ?? '';
}
