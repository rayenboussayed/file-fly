import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  isHealthPath,
  resolveBasicAuthEnabled,
  synthAuthorizationHeader,
} from './basic-auth.js';

describe('basic-auth perimeter helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
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

  describe('synthAuthorizationHeader', () => {
    it('base64-encodes user:password in Basic format', () => {
      const header = synthAuthorizationHeader('alice', 's3cret');
      if (header === undefined) throw new Error('expected a Basic header value');
      expect(header).toBe(`Basic ${Buffer.from('alice:s3cret', 'utf8').toString('base64')}`);
      expect(Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8')).toBe(
        'alice:s3cret',
      );
    });

    it('keeps colons in the password intact', () => {
      expect(synthAuthorizationHeader('me', 'a:b')).toBe(
        `Basic ${Buffer.from('me:a:b', 'utf8').toString('base64')}`,
      );
    });

    it('returns undefined when the pair is incomplete', () => {
      expect(synthAuthorizationHeader(undefined, 'secret')).toBeUndefined();
      expect(synthAuthorizationHeader('alice', undefined)).toBeUndefined();
      expect(synthAuthorizationHeader('', 'secret')).toBeUndefined();
      expect(synthAuthorizationHeader('alice', '')).toBeUndefined();
    });
  });

  describe('basicAuthEnabled (env-backed)', () => {
    it('is true when both env vars are set', async () => {
      vi.stubEnv('AUTH_USERNAME', 'alice');
      vi.stubEnv('AUTH_PASSWORD', 'secret');
      vi.resetModules();
      const module_ = await import('./basic-auth.js');
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
      await expect(import('./basic-auth.js')).rejects.toThrow(/must be set together/u);
    });
  });
});
