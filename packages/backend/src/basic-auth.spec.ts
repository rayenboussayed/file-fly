import type { ExecutionContext } from '@nestjs/common';

import { UnauthorizedException } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isHealthPath, resolveBasicAuthEnabled } from './basic-auth.js';

const CHALLENGE = 'Basic realm="file-fly"';
const MISSING_BODY = { message: 'Missing or bad formatted authorization header', statusCode: 401 };
const INVALID_BODY = { error: 'Unauthorized', message: 'Invalid credentials', statusCode: 401 };

const { mockCanActivate } = vi.hoisted(() => ({ mockCanActivate: vi.fn() }));

vi.mock('nest-basic-auth', () => ({
  BasicAuthGuard: class {
    canActivate = mockCanActivate;
    constructor() {}
  },
}));

/**
 * Creates a Fastify instance with the perimeter installed and two probe routes.
 * @param module_ - The freshly imported adapter module.
 * @returns The Fastify instance from the Nest adapter.
 */
async function boot(module_: typeof import('./basic-auth.js')) {
  const instance = new FastifyAdapter().getInstance();
  await module_.registerBasicAuth(instance);
  instance.get('/health', () => ({ status: 'ok' }));
  instance.get('/probe', () => ({ status: 'ok' }));
  return instance;
}

/**
 * Loads the adapter after stubbing both-or-neither credentials.
 * @returns The freshly imported adapter module.
 */
async function loadEnabled() {
  vi.stubEnv('AUTH_USERNAME', 'alice');
  vi.stubEnv('AUTH_PASSWORD', 'secret');
  vi.resetModules();
  return import('./basic-auth.js');
}

/**
 * Makes the mocked guard reject with the package's challenge.
 */
function rejectWithChallenge(): void {
  mockCanActivate.mockImplementation((context: ExecutionContext) => {
    context.switchToHttp().getResponse().header('www-authenticate', CHALLENGE);
    throw new UnauthorizedException();
  });
}

describe('basic-auth perimeter', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.resetAllMocks();
  });

  describe('isHealthPath', () => {
    it('exempts exactly /health, its trailing-slash variant and any query string', () => {
      expect(isHealthPath('/health')).toBe(true);
      expect(isHealthPath('/health/')).toBe(true);
      expect(isHealthPath('/health?probe=1')).toBe(true);
    });

    it('does not exempt lookalike paths', () => {
      expect(isHealthPath('/healthcheck')).toBe(false);
      expect(isHealthPath('/health/details')).toBe(false);
      expect(isHealthPath('/metrics')).toBe(false);
      expect(isHealthPath('/HEALTH')).toBe(false);
      expect(isHealthPath(undefined)).toBe(false);
    });
  });

  describe('resolveBasicAuthEnabled', () => {
    it('enables the perimeter only when both credentials are non-empty', () => {
      expect(resolveBasicAuthEnabled('alice', 'secret')).toBe(true);
      expect(resolveBasicAuthEnabled(undefined, undefined)).toBe(false);
      expect(resolveBasicAuthEnabled('', '')).toBe(false);
      expect(resolveBasicAuthEnabled('  ', '  ')).toBe(false);
    });

    it('throws when exactly one credential is set', () => {
      expect(() => resolveBasicAuthEnabled('alice', undefined)).toThrow(
        /must be set together/u,
      );
      expect(() => resolveBasicAuthEnabled(undefined, 'secret')).toThrow(
        /must be set together/u,
      );
      expect(() => resolveBasicAuthEnabled('alice', '  ')).toThrow(
        /must be set together/u,
      );
    });
  });

  describe('environment-backed enablement', () => {
    it('is true when both env vars are set', async () => {
      const module_ = await loadEnabled();
      expect(module_.basicAuthEnabled()).toBe(true);
    });

    it('is false when neither env var is set', async () => {
      vi.stubEnv('AUTH_USERNAME', '');
      vi.stubEnv('AUTH_PASSWORD', '');
      vi.resetModules();
      const module_ = await import('./basic-auth.js');
      expect(module_.basicAuthEnabled()).toBe(false);
    });

    it('rejects boot when only one env var is set', async () => {
      vi.stubEnv('AUTH_USERNAME', 'alice');
      vi.stubEnv('AUTH_PASSWORD', '');
      vi.resetModules();
      await expect(import('./basic-auth.js')).rejects.toThrow(
        /must be set together/u,
      );
    });
  });

  describe('registerBasicAuth', () => {
    it('leaves routes open when credentials are unset', async () => {
      vi.stubEnv('AUTH_USERNAME', '');
      vi.stubEnv('AUTH_PASSWORD', '');
      vi.resetModules();
      const module_ = await import('./basic-auth.js');
      const instance = await boot(module_);
      const response = await instance.inject({ method: 'GET', url: '/probe' });
      expect(response.statusCode).toBe(200);
      expect(module_.basicAuthEnabled()).toBe(false);
    });

    it('lets /health pass without invoking the guard', async () => {
      const module_ = await loadEnabled();
      const instance = await boot(module_);
      rejectWithChallenge();
      const response = await instance.inject({ method: 'GET', url: '/health?probe=1' });
      expect(response.statusCode).toBe(200);
      expect(mockCanActivate).not.toHaveBeenCalled();
    });

    it('admits a request with a complete x-auth pair', async () => {
      const module_ = await loadEnabled();
      const instance = await boot(module_);
      mockCanActivate.mockReturnValue(true);
      const response = await instance.inject({
        headers: { 'x-auth-password': 'secret', 'x-auth-username': 'alice' },
        method: 'GET',
        url: '/probe',
      });
      expect(response.statusCode).toBe(200);
      expect(mockCanActivate).toHaveBeenCalled();
    });

    it('rejects a missing pair with the missing-header body and the challenge', async () => {
      const module_ = await loadEnabled();
      const instance = await boot(module_);
      rejectWithChallenge();
      const response = await instance.inject({ method: 'GET', url: '/probe' });
      expect(response.statusCode).toBe(401);
      expect(response.headers['www-authenticate']).toBe(CHALLENGE);
      expect(response.json()).toEqual(MISSING_BODY);
    });

    it('rejects a partial pair with the missing-header body', async () => {
      const module_ = await loadEnabled();
      const instance = await boot(module_);
      rejectWithChallenge();
      const response = await instance.inject({
        headers: { 'x-auth-username': 'alice' },
        method: 'GET',
        url: '/probe',
      });
      expect(response.statusCode).toBe(401);
      expect(response.headers['www-authenticate']).toBe(CHALLENGE);
      expect(response.json()).toEqual(MISSING_BODY);
    });

    it('rejects an empty username with a password as a missing pair', async () => {
      const module_ = await loadEnabled();
      const instance = await boot(module_);
      rejectWithChallenge();
      const response = await instance.inject({
        headers: { 'x-auth-password': 'secret', 'x-auth-username': '' },
        method: 'GET',
        url: '/probe',
      });
      expect(response.statusCode).toBe(401);
      expect(response.headers['www-authenticate']).toBe(CHALLENGE);
      expect(response.json()).toEqual(MISSING_BODY);
    });

    it.each([
      {
        body: INVALID_BODY,
        headers: { 'x-auth-password': 'secret', 'x-auth-username': 'alice' },
        label: 'a complete pair',
      },
      { body: MISSING_BODY, headers: {}, label: 'no pair' },
    ])('rejects when the guard returns false with $label', async ({ body, headers }) => {
      const module_ = await loadEnabled();
      const instance = await boot(module_);
      mockCanActivate.mockReturnValue(false);
      const response = await instance.inject({ headers, method: 'GET', url: '/probe' });
      expect(response.statusCode).toBe(401);
      expect(response.headers['www-authenticate']).toBeUndefined();
      expect(response.json()).toEqual(body);
    });

    it('treats duplicate x-auth headers as a wrong pair', async () => {
      const module_ = await loadEnabled();
      const instance = await boot(module_);
      rejectWithChallenge();
      const response = await instance.inject({
        headers: {
          'x-auth-password': ['wrong'],
          'x-auth-username': ['alice'],
        },
        method: 'GET',
        url: '/probe',
      });
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual(INVALID_BODY);
    });

    it('rejects a wrong pair with the invalid-credentials body and the challenge', async () => {
      const module_ = await loadEnabled();
      const instance = await boot(module_);
      rejectWithChallenge();
      const response = await instance.inject({
        headers: { 'x-auth-password': 'wrong', 'x-auth-username': 'alice' },
        method: 'GET',
        url: '/probe',
      });
      expect(response.statusCode).toBe(401);
      expect(response.headers['www-authenticate']).toBe(CHALLENGE);
      expect(response.json()).toEqual(INVALID_BODY);
    });

    it('does not set a challenge when the guard set none', async () => {
      const module_ = await loadEnabled();
      const instance = await boot(module_);
      mockCanActivate.mockImplementation(() => {
        throw new UnauthorizedException();
      });
      const response = await instance.inject({ method: 'GET', url: '/probe' });
      expect(response.statusCode).toBe(401);
      expect(response.headers['www-authenticate']).toBeUndefined();
      expect(response.json()).toEqual(MISSING_BODY);
    });

    it('propagates errors that are not UnauthorizedException', async () => {
      const module_ = await loadEnabled();
      const instance = await boot(module_);
      mockCanActivate.mockImplementation(() => {
        throw new Error('boom');
      });
      const response = await instance.inject({ method: 'GET', url: '/probe' });
      expect(response.statusCode).toBe(500);
    });

    it('removes the package env fallback keys before loading the guard', async () => {
      vi.stubEnv('AUTH_NAME', 'other');
      vi.stubEnv('AUTH_PASS', 'other-pass');
      vi.stubEnv('AUTH_REALM', 'other-realm');
      const module_ = await loadEnabled();
      await boot(module_);
      expect(process.env.AUTH_NAME).toBeUndefined();
      expect(process.env.AUTH_PASS).toBeUndefined();
      expect(process.env.AUTH_REALM).toBeUndefined();
    });
  });
});
