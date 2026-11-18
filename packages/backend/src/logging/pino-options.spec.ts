import { describe, expect, it } from 'vitest';

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
    const req = options.serializers?.['req'] as (
      request: { headers: Record<string, string>; id: string; method: string; url?: string; },
    ) => Record<string, unknown>;
    const serialized = req({
      headers: { authorization: 'Bearer secret', cookie: 'session=secret' },
      id: 'req-1',
      method: 'POST',
      url: '/image?source=signed-url',
    });
    expect(serialized).toEqual({ id: 'req-1', method: 'POST', url: '/image' });
  });

  it('serializes responses with only the status code', () => {
    const options = buildPinoHttpOptions({ isProduction: true });
    const res = options.serializers?.['res'] as (
      response: { headers: Record<string, string>; statusCode: number; },
    ) => Record<string, unknown>;
    expect(res({ headers: { 'set-cookie': 'x' }, statusCode: 201 })).toEqual({
      statusCode: 201,
    });
  });
});
