import type { IncomingMessage, ServerResponse } from 'node:http';
import type { LoggerOptions } from 'pino';
import type { Options as PinoHttpOptions } from 'pino-http';
import type { PrettyOptions } from 'pino-pretty';

/**
 * Inputs for the pino configuration builders.
 * `level` wins over the environment defaults when set.
 */
export interface PinoEnvironment {
  /** Whether the app runs in production mode. Drives the default level only. */
  isProduction: boolean;
  /** Explicit pino level (e.g. from `LOG_LEVEL`); unset means `info`/`debug`. */
  level?: string;
}

/**
 * Removes the query string from a URL.
 * Media `source` parameters may embed signed remote URLs, so the query must never reach the logs.
 * @param url - The raw request URL.
 * @returns The path portion, or `undefined` when the URL was missing.
 */
export function stripQuery(url: string | undefined): string | undefined {
  if (!url) {
    return url;
  }
  const index = url.indexOf('?');
  return index === -1 ? url : url.slice(0, index);
}

/** Paths censored from any nested request/response object pino sees. */
export const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
] as const;

/**
 * Request serializer: id, method and path only. Headers and query strings are dropped by design.
 * @param request - The raw Node request.
 * @returns A minimal log object with id, method and path only.
 */
const serializeRequest = (
  request: IncomingMessage & { id?: number | string },
) => ({
  id: request.id,
  method: request.method,
  url: stripQuery(request.url),
});

/**
 * Response serializer: status code only.
 * @param response - The raw Node response.
 * @returns A minimal log object with the status code only.
 */
const serializeResponse = (response: ServerResponse) => ({
  statusCode: response.statusCode,
});

const resolveLevel = ({ isProduction, level }: PinoEnvironment) =>
  level ?? (isProduction ? 'info' : 'debug');

/**
 * Builds the pino-http options used by nestjs-pino. Adds request auto-logging
 * (excluding `/health`) and pretty output in development.
 * @param environment - Runtime inputs; see {@link PinoEnvironment}.
 * @returns Options passed to `LoggerModule.forRoot()` as `pinoHttp`.
 */
export function buildPinoHttpOptions(
  environment: PinoEnvironment,
): PinoHttpOptions {
  const { isProduction } = environment;
  return {
    ...buildPinoOptions(environment),
    ...(isProduction
      ? {}
      : { transport: { options: { singleLine: true } satisfies PrettyOptions, target: 'pino-pretty' } }),
    serializers: { req: serializeRequest, res: serializeResponse },
  };
}

/**
 * Builds the base pino options shared by the bootstrap logger and the request logger.
 * @param environment - Runtime inputs; see {@link PinoEnvironment}.
 * @returns Options passed straight to `pino()`.
 */
export function buildPinoOptions(environment: PinoEnvironment): LoggerOptions {
  return {
    level: resolveLevel(environment),
    redact: { censor: '[Redacted]', paths: [...redactPaths] },
  };
}
