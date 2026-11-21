import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import fixture from '../test/fixtures/metrics.fixture.json';
import { useMetricsQuery } from './metrics-query.js';

const mocks = vi.hoisted(() => ({
  fetchMetrics: vi.fn<() => Promise<unknown>>(),
}));

vi.mock('./api', async (importOriginal) => {
  const original = await importOriginal<typeof import('./api')>();
  return { ...original, fetchMetrics: mocks.fetchMetrics };
});

const snapshot: unknown = fixture;

const renderMetricsQuery = () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  const rendered = renderHook(() => useMetricsQuery(), { wrapper });
  return { ...rendered, queryClient };
};

beforeEach(() => {
  mocks.fetchMetrics.mockReset();
});

describe('useMetricsQuery', () => {
  it('returns the query result with the fetched snapshot', async () => {
    mocks.fetchMetrics.mockResolvedValue(snapshot);
    const { result } = renderMetricsQuery();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(fixture);
    expect(result.current.isError).toBe(false);
    expect(result.current.isPending).toBe(false);
  });

  it('configures the shared key, polling and no-retry options', () => {
    mocks.fetchMetrics.mockResolvedValue(snapshot);
    const { queryClient } = renderMetricsQuery();

    const query = queryClient.getQueryCache().find({ queryKey: ['metrics'] });
    expect(query).toBeDefined();
    expect(query?.queryKey).toEqual(['metrics']);
    expect(query?.options).toMatchObject({
      refetchInterval: 5000,
      refetchIntervalInBackground: true,
      retry: false,
    });
  });

  it('surfaces errors through the query result', async () => {
    mocks.fetchMetrics.mockRejectedValue(new Error('network down'));
    const { result } = renderMetricsQuery();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('network down');
  });
});
