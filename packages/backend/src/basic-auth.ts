// eslint-disable-next-line n/no-extraneous-import
import type { FastifyInstance, onRequestHookHandler } from 'fastify';

import { Logger, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';

import { environment } from './environment.js';

/** Logger for the basic-auth perimeter; one boot line, never per-request. */
const logger = new Logger('BasicAuth');

/**
 * Whether the perimeter is active. Implemented by both-or-neither: the
 * environment schema enforces pair-ness at boot; this pure helper mirrors it
 * (and throws on a half-configured pair) so it can be unit-tested in isolation.
 * @returns True when `AUTH_USERNAME` and `AUTH_PASSWORD` are both non-empty.
 */
export function basicAuthEnabled(): boolean {
  return resolveBasicAuthEnabled(environment.AUTH_USERNAME, environment.AUTH_PASSWORD);
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
  const path = url.split('?', 1)[0] ?? '';
  return path === '/health' || path === '/health/';
}

/**
 * Installs the basic-auth perimeter on the Fastify instance.
 *
 * Every route except `/health` requires the `x-auth-username` and
 * `x-auth-password` headers, re-sent on every request. `@fastify/basic-auth`
 * performs parsing and the 401; a `validate` closure enforces the configured
 * pair in constant time. A client-sent `Authorization` header is never
 * honored — a shim rewrites the x-auth pair into `Authorization` for the
 * plugin (or removes an attacker's own `Authorization`), so the x-auth pair is
 * the only credential transport.
 *
 * No-op (with a single boot warning) unless both `AUTH_USERNAME` and
 * `AUTH_PASSWORD` are set.
 * @param instance - The Fastify instance to decorate, passed by the bootstrap.
 */
export async function registerBasicAuth(instance: FastifyInstance): Promise<void> {
  if (!basicAuthEnabled()) {
    logger.warn('AUTH_USERNAME/AUTH_PASSWORD are not set; basic auth is disabled');
    return;
  }
  const expectedUser = environment.AUTH_USERNAME ?? '';
  const expectedPassword = environment.AUTH_PASSWORD ?? '';

  const plugin = (await import('@fastify/basic-auth')).default;
  await instance.register(plugin, {
    // A challenge would send browsers into an unfulfillable prompt; this is a
    // header-pair contract for API clients, not a browser SSO flow.
    authenticate: false,
    async validate(username: string, password: string): Promise<Error | undefined> {
      if (
        !credentialsMatch(username, expectedUser) ||
        !credentialsMatch(password, expectedPassword)
      ) {
        return new UnauthorizedException('Invalid credentials');
      }
      return undefined;
    },
  });

  // The plugin decorates the instance with `basicAuth` during registration and
  // the declaration merging makes it available to TypeScript; the hook resolves
  // it at request time, when the plugin has finished loading.
  const perimeter: onRequestHookHandler = (request, reply, next) => {
    if (isHealthPath(request.raw.url)) {
      next();
      return;
    }
    // The x-auth pair is the only accepted transport: a client-supplied
    // Authorization header never reaches the plugin.
    delete request.headers.authorization;
    const headerUsername = request.headers['x-auth-username'];
    const headerPassword = request.headers['x-auth-password'];
    const pair = synthAuthorizationHeader(
      typeof headerUsername === 'string' ? headerUsername : undefined,
      typeof headerPassword === 'string' ? headerPassword : undefined,
    );
    if (pair !== undefined) {
      request.headers.authorization = pair;
    }
    instance.basicAuth(request, reply, next);
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
 * Builds the `Authorization` header value for the plugin from the custom
 * `x-auth-*` pair, or `undefined` when the pair is incomplete.
 * @param username - The `x-auth-username` header value, if any.
 * @param password - The `x-auth-password` header value, if any.
 * @returns A `Basic <base64(user:pass)>` header value, or undefined.
 */
export function synthAuthorizationHeader(
  username: string | undefined,
  password: string | undefined,
): string | undefined {
  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    username.length === 0 ||
    password.length === 0
  ) {
    return undefined;
  }
  const joined = `${username}:${password}`;
  return `Basic ${Buffer.from(joined, 'utf8').toString('base64')}`;
}

/**
 * Compares two credential strings in constant time (via SHA-256 digests of equal length).
 * @param provided - The credential supplied by the client.
 * @param expected - The configured credential.
 * @returns True when both digests match exactly.
 */
function credentialsMatch(provided: string, expected: string): boolean {
  const providedDigest = createHash('sha256').update(provided, 'utf8').digest();
  const expectedDigest = createHash('sha256').update(expected, 'utf8').digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}
