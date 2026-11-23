import type { NormalizedClsService } from '@/services/normalized-cls.service.js';

/**
 * Reads the current request's `content-type` header as a string.
 *
 * Returns `''` when the request or the header is absent, mirroring
 * `String(cls.request()?.headers?.['content-type'] ?? '')`. Kept as a pure
 * function over the normalized CLS context so specs that stub only `request()`
 * keep working without changes (no method is added to
 * {@link NormalizedClsService}).
 * @param cls - Normalized request context carrying the current request.
 * @returns The raw content-type header value, or `''` when missing.
 */
export function requestContentType(cls: NormalizedClsService): string {
  return String(cls.request()?.headers?.['content-type'] ?? '');
}
