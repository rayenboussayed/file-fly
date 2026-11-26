import { beforeEach, describe, expect, it, vi } from 'vitest';

import fixture from '../test/fixtures/metrics.fixture.json';
import {
  ApiError,
  fetchMetrics,
  MetricsContractError,
  metricsToken,
  setMetricsToken,
} from './api.js';

const stubFetch = (response: () => Response) => {
  const calls: Array<[unknown, RequestInit | undefined]> = [];
  const mock = vi.fn(async (input: unknown, init?: RequestInit) => {
    calls.push([input, init]);
    return response();
  });
  vi.stubGlobal('fetch', mock);
  return calls;
};

const snapshotResponse = () =>
  Response.json(fixture, {
    headers: { 'content-type': 'application/json' },
    status: 200,
  });

beforeEach(() => {
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe('token storage', () => {
  it('stores, reads and clears the session token', () => {
    expect(metricsToken()).toBeUndefined();
    setMetricsToken('secret-token');
    expect(metricsToken()).toBe('secret-token');
    setMetricsToken();
    expect(metricsToken()).toBeUndefined();
  });

  it('trims and clears blank tokens', () => {
    setMetricsToken('  padded  ');
    expect(metricsToken()).toBe('padded');
    setMetricsToken(' '.repeat(3));
    expect(metricsToken()).toBeUndefined();
  });
});

describe('fetchMetrics', () => {
  it('returns the parsed snapshot', async () => {
    stubFetch(snapshotResponse);
    const snapshot = await fetchMetrics();
    expect(snapshot.totals.requests).toBe(fixture.totals.requests);
  });

  it('sends no Authorization header without a token', async () => {
    const calls = stubFetch(snapshotResponse);
    await fetchMetrics();
    expect(calls[0]?.[1]?.headers).toBeUndefined();
  });

  it('sends the bearer token when one is stored', async () => {
    setMetricsToken('secret-token');
    const calls = stubFetch(snapshotResponse);
    await fetchMetrics();
    expect(calls[0]?.[1]?.headers).toEqual({
      authorization: 'Bearer secret-token',
    });
  });

  it('throws ApiError with the status on 401 and 503', async () => {
    stubFetch(() => new Response('no', { status: 401 }));
    await expect(fetchMetrics()).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    });
    stubFetch(() => new Response('no', { status: 503 }));
    await expect(fetchMetrics()).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
    });
  });

  it('throws ApiError for any non-2xx response', async () => {
    stubFetch(() => new Response('broken', { status: 500 }));
    let error: unknown;
    try {
      await fetchMetrics();
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
  });

  it('keeps extra row fields at runtime', async () => {
    stubFetch(() => Response.json({
      ...fixture,
      perIp: fixture.perIp.map((row) => ({ ...row, extra: 'kept' })),
    }, { headers: { 'content-type': 'application/json' }, status: 200 }));
    const snapshot = await fetchMetrics();
    expect(snapshot.perIp[0]?.ip).toBe(fixture.perIp[0]?.ip);
    expect(snapshot.perIp[0]?.extra).toBe('kept');
  });

  it('rejects a payload that violates the contract without echoing it', async () => {
    stubFetch(() => Response.json({
      ...fixture,
      perIp: [{ ...fixture.perIp[0], ip: '203.0.113.7' }],
      totals: { requests: 'many' },
    }, {
      headers: { 'content-type': 'application/json' },
      status: 200,
    }));
    let error: unknown;
    try {
      await fetchMetrics();
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(MetricsContractError);
    expect((error as Error).message).not.toContain('203.0.113.7');
  });

  it('rejects a payload with missing top-level fields', async () => {
    stubFetch(() => Response.json({ requests: 1 }, {
      headers: { 'content-type': 'application/json' },
      status: 200,
    }));
    await expect(fetchMetrics()).rejects.toBeInstanceOf(MetricsContractError);
  });
});
