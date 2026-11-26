import * as AppHeaders from '@/constants/header.js';

/**
 * Request headers a cross-origin client may send beyond the CORS-safelisted set.
 * The auth pair is included so a separately hosted client can pass the basic-auth
 * perimeter; content-type serves the JSON build routes and the file hash the
 * upload cache hint. The W3C trace headers keep cross-origin telemetry working
 * as documented in the README.
 */
const allowedCorsHeaders = [
  'authorization',
  'baggage',
  'content-type',
  'traceparent',
  'tracestate',
  AppHeaders.HEADER_X_AUTH_PASSWORD,
  AppHeaders.HEADER_X_AUTH_USERNAME,
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
    exposedHeaders: [AppHeaders.HEADER_X_FILE_HASH, AppHeaders.HEADER_X_FONT_SUBSET],
    origin: origins === undefined ? false : origins,
  };
}
