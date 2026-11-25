// eslint-disable-next-line n/no-extraneous-import
import type { FastifyInstance, FastifyReply, FastifyRequest, onRequestHookHandler } from 'fastify';

import { Logger, UnauthorizedException } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';

import { HEADER_X_AUTH_PASSWORD, HEADER_X_AUTH_USERNAME } from './constants/header.js';
import { environment } from './environment.js';

/** Logger for the basic-auth perimeter; one boot line, never per-request. */
const logger = new Logger('BasicAuth');

/** Realm reported in the challenge emitted by the package's guard. */
const REALM = 'file-fly';

/**
 * Empty header name. The guard reads `options.header ?? 'authorization'`, so an
 * empty string makes it look up a header HTTP cannot carry. Standard
 * `Authorization` stays ignored, which preserves the x-auth contract and leaves
 * the `/metrics` bearer token untouched.
 */
const STANDARD_HEADER_DISABLED = '';

/** Credentials narrowed to required strings once the both-or-neither rule passes. */
const AUTH_CREDENTIALS = (() => {
  const name = environment.AUTH_USERNAME;
  const pass = environment.AUTH_PASSWORD;
  return resolveBasicAuthEnabled(name, pass)
    ? { name: String(name), pass: String(pass) }
    : undefined;
})();

/**
 * Whether the perimeter is active. The environment schema enforces both-or-neither
 * at boot, so a configured pair is always complete.
 * @returns True when `AUTH_USERNAME` and `AUTH_PASSWORD` are both set.
 */
export function basicAuthEnabled(): boolean {
  return AUTH_CREDENTIALS !== undefined;
}

/**
 * Whether the request targets the liveness probe. `/health` (with or without a
 * query string or trailing slash) is exempt from the perimeter so Docker
 * `HEALTHCHECK` and orchestrator probes keep working without credentials.
 * @param url - The raw request URL, if available.
 * @returns True when the path is exactly `/health`.
 */
export function isHealthPath(url: string | undefined): boolean {
  if (url === undefined) return false;
  const path = url.split('?', 1).join('');
  return path === '/health' || path === '/health/';
}

/**
 * Installs the package-backed perimeter on the Fastify instance.
 *
 * The guard runs in an `onRequest` hook, ahead of body parsing and Nest
 * interceptors, so it also covers routes Fastify registers outside Nest, such
 * as static dashboard assets, Swagger and unmatched URLs. `/health` stays public.
 * No-op (with a single boot warning) unless both credentials are configured.
 * @param instance - The Fastify instance to decorate, passed by the bootstrap.
 */
export async function registerBasicAuth(instance: FastifyInstance): Promise<void> {
  if (AUTH_CREDENTIALS === undefined) {
    logger.warn('AUTH_USERNAME/AUTH_PASSWORD are not set; basic auth is disabled');
    return;
  }
  const guard = await createGuard(AUTH_CREDENTIALS);
  const perimeter: onRequestHookHandler = (request, reply, next) => {
    if (isHealthPath(request.raw.url)) {
      next();
      return;
    }
    const context = new ExecutionContextHost([request, reply], Object, Object);
    try {
      if (!guard.canActivate(context)) {
        rejectRequest(reply, !hasCredentialPair(request));
        return;
      }
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) throw error;
      rejectRequest(reply, !hasCredentialPair(request));
      return;
    }
    next();
  };
  instance.addHook('onRequest', perimeter);
  logger.log('Basic auth perimeter enabled for all routes except /health');
}

/**
 * Pure decision for the both-or-neither rule.
 * @param username - The configured `AUTH_USERNAME`, if any.
 * @param password - The configured `AUTH_PASSWORD`, if any.
 * @returns True when both are non-empty; false when both are absent; throws otherwise.
 * @throws Error Exactly one of the two credentials is set.
 */
export function resolveBasicAuthEnabled(
  username: string | undefined,
  password: string | undefined,
): boolean {
  const hasUser = username !== undefined && username.trim().length > 0;
  const hasPassword = password !== undefined && password.trim().length > 0;
  if (hasUser !== hasPassword) {
    throw new Error(
      'AUTH_USERNAME and AUTH_PASSWORD must be set together (basic auth is enabled only when both are set)',
    );
  }
  return hasUser;
}

/**
 * Builds the package guard from the configured pair once at boot.
 * @param credentials - The validated username and password pair.
 * @param credentials.name - The configured username.
 * @param credentials.pass - The configured password.
 * @returns The configured `BasicAuthGuard` instance.
 */
async function createGuard(credentials: { name: string; pass: string }) {
  // The package appends AUTH_NAME/AUTH_PASS from the host environment to the
  // explicit credentials. Removing those keys keeps the repo's pair authoritative.
  delete process.env.AUTH_NAME;
  delete process.env.AUTH_PASS;
  delete process.env.AUTH_REALM;
  const { BasicAuthGuard } = await import('nest-basic-auth');
  return new BasicAuthGuard({
    credentials,
    header: STANDARD_HEADER_DISABLED,
    headerNames: {
      name: HEADER_X_AUTH_USERNAME,
      pass: HEADER_X_AUTH_PASSWORD,
    },
    realm: REALM,
  });
}

/**
 * Whether the request supplied both x-auth headers. Used only to preserve the
 * exact 401 body shape for a missing pair.
 * @param request - The incoming Fastify request.
 * @returns True when both header values are non-empty strings.
 */
function hasCredentialPair(request: FastifyRequest): boolean {
  const {
    [HEADER_X_AUTH_PASSWORD]: password,
    [HEADER_X_AUTH_USERNAME]: username,
  } = request.headers;
  return (
    typeof username === 'string' && username.length > 0 &&
    typeof password === 'string' && password.length > 0
  );
}

/**
 * Sends a 401 with the challenge set by the guard and the repo's existing body.
 * @param reply - The Fastify reply to complete.
 * @param missingPair - Whether the request had no complete x-auth pair.
 * @returns The sent reply.
 */
function rejectRequest(reply: FastifyReply, missingPair: boolean): FastifyReply {
  const challenge = reply.getHeader('www-authenticate');
  if (challenge !== undefined) {
    reply.header('www-authenticate', challenge);
  }
  const body = missingPair
    ? { message: 'Missing or bad formatted authorization header', statusCode: 401 }
    : { error: 'Unauthorized', message: 'Invalid credentials', statusCode: 401 };
  return reply.code(401).send(body);
}
