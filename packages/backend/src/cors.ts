import * as AppHeaders from '@/constants/header.js';

/**
 * Request headers a cross-origin client may send beyond the CORS-safelisted set.
 * The auth pair is included so a separately hosted client can pass the basic-auth
 * perimeter; content-type serves the JSON build routes and the file hash the
 * upload cache hint.
 */
const allowedCorsHeaders = [
  'authorization',
  'content-type',
  'x-auth-password',
  'x-auth-username',
  AppHeaders.HEADER_X_FILE_HASH,
] as const;

/**
 * Builds the production CORS options.
 * @param origins - Configured CORS_ORIGIN values; undefined disables cross-origin reads.
 * @returns The enableCors options object, with an explicit request-header allowlist.
 */
export function buildCorsOptions(origins: string[] | undefined) {
  return {
    allowedHeaders: [...allowedCorsHeaders],
    credentials: true,
    exposedHeaders: Object.values(AppHeaders),
    origin: origins ?? false,
  };
}
