import type { NormalizedClsService } from '@/services/normalized-cls.service.js';

/**
 * Reads a named header without indexing the headers object with a variable key.
 * @param headers - The request headers.
 * @param name - The header name to look up.
 * @returns The header value, or undefined when absent.
 */
export function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | string[] | undefined {
  return Object.entries(headers).find(([key]) => key === name)?.[1];
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
