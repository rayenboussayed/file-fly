import pino from 'pino';
import { describe, expect, it } from 'vitest';

import { HEADER_X_AUTH_PASSWORD, HEADER_X_AUTH_USERNAME } from '@/constants/header.js';

import {
  buildPinoHttpOptions,
  buildPinoOptions,
  redactPaths,
  stripQuery,
} from './pino-options.js';

describe('stripQuery', () => {
  it('removes the query string', () => {
    expect(stripQuery('/image?source=https://example.com/x.jpg&width=800')).toBe('/image');
  });

  it('keeps a bare path untouched', () => {
    expect(stripQuery('/metrics')).toBe('/metrics');
  });

  it('passes undefined through', () => {
    expect(stripQuery(undefined)).toBeUndefined();
  });

  it('drops everything from an empty-parameter query', () => {
    expect(stripQuery('/image?')).toBe('/image');
  });
});

describe('buildPinoOptions', () => {
  it('defaults to info in production and debug otherwise', () => {
    expect(buildPinoOptions({ isProduction: true }).level).toBe('info');
    expect(buildPinoOptions({ isProduction: false }).level).toBe('debug');
  });

  it('honours an explicit level', () => {
    expect(
      buildPinoOptions({ isProduction: true, level: 'warn' }).level,
    ).toBe('warn');
  });

  it('redacts authorization and cookie headers', () => {
    const options = buildPinoOptions({ isProduction: true });
    expect(options.redact).toMatchObject({
      paths: expect.arrayContaining([...redactPaths]),
    });
  });

  it('redacts the basic-auth header pair when pino sees raw headers', () => {
    const lines: string[] = [];
    const sink = { write: (line: string) => { lines.push(line); } };
    const logger = pino(buildPinoOptions({ isProduction: true }), sink);

    logger.info({
      req: {
        headers: {
          authorization: 'Bearer secret',
          cookie: 'session=secret',
          [HEADER_X_AUTH_PASSWORD]: 'secret',
          [HEADER_X_AUTH_USERNAME]: 'alice',
          'x-file-hash': 'keep-me',
        },
      },
    }, 'probe');

    const output = lines.join('');
    expect(output).toContain('"authorization":"[Redacted]"');
    expect(output).toContain('"cookie":"[Redacted]"');
    expect(output).toContain('"x-auth-password":"[Redacted]"');
    expect(output).toContain('"x-auth-username":"[Redacted]"');
    expect(output).toContain('"x-file-hash":"keep-me"');
  });
});

describe('buildPinoHttpOptions', () => {
  it('sends pretty transport only outside production', () => {
    expect(buildPinoHttpOptions({ isProduction: true })).not.toHaveProperty('transport');
    expect(buildPinoHttpOptions({ isProduction: false }).transport).toMatchObject({
      target: 'pino-pretty',
    });
  });

  it('serializes requests without query string or headers', () => {
    const options = buildPinoHttpOptions({ isProduction: true });
    const request = options.serializers?.['req'] as (
      request: { headers: Record<string, string>; id: string; method: string; url?: string; },
    ) => Record<string, unknown>;
    const serialized = request({
      headers: { authorization: 'Bearer secret', cookie: 'session=secret' },
      id: 'req-1',
      method: 'POST',
      url: '/image?source=signed-url',
    });
    expect(serialized).toEqual({ id: 'req-1', method: 'POST', url: '/image' });
  });

  it('serializes responses with only the status code', () => {
    const options = buildPinoHttpOptions({ isProduction: true });
    const responseSerializer = options.serializers?.['res'] as (
      response: { headers: Record<string, string>; statusCode: number; },
    ) => Record<string, unknown>;
    expect(responseSerializer({ headers: { 'set-cookie': 'x' }, statusCode: 201 })).toEqual({
      statusCode: 201,
    });
  });
});
