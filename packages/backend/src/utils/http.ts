import type { NormalizedClsService } from '@/services/normalized-cls.service.js';

type HeaderValue = string | string[] | undefined;

/**
 * Reads a named header without indexing the headers object with a variable key.
 * @param headers - The request headers.
 * @param name - The header name to look up.
 * @returns The header value, or undefined when absent.
 */
export function headerValue(
  headers: Record<string, HeaderValue>,
  name: string,
): HeaderValue {
  // Reflect.get keeps the lookup O(1) without indexing with a variable key.
  const value: HeaderValue = Reflect.get(headers, name);
  return value;
}

/**
 * Reads the current request's media type without parameters.
 *
 * Returns `''` when the request or the header is absent. The header is split
 * before `;` and trimmed, matching the expression each document service used
 * before this helper existed. It stays a pure function over the normalized CLS
 * context so specs that stub only `request()` keep working.
 * @param cls - Normalized request context carrying the current request.
 * @returns The media type without parameters, or `''` when missing.
 */
export function requestMime(cls: NormalizedClsService): string {
  const header = String(cls.request()?.headers?.['content-type'] ?? '');
  return header.split(';', 1)[0]?.trim() ?? '';
}
