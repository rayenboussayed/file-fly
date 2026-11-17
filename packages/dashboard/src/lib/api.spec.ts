import { beforeEach, describe, expect, it, vi } from 'vitest';

import fixture from '../test/fixtures/metrics.fixture.json';
import {
  ApiError,
  fetchMetrics,
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
  new Response(JSON.stringify(fixture), {
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
    setMetricsToken('   ');
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
    const error = await fetchMetrics().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
  });
});
