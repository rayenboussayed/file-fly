import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../lib/api.js';
import fixture from '../test/fixtures/metrics.fixture.json';
import { IpDetailPage } from './IpDetailPage.js';

const mocks = vi.hoisted(() => ({
  fetchMetrics: vi.fn<() => Promise<unknown>>(),
}));

vi.mock('../lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/api')>();
  return { ...original, fetchMetrics: mocks.fetchMetrics };
});

const renderPage = (ip: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <IpDetailPage ip={ip} />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  sessionStorage.clear();
  mocks.fetchMetrics.mockReset();
});

describe('IpDetailPage', () => {
  it('renders the counters for a known IP', async () => {
    mocks.fetchMetrics.mockResolvedValue(fixture as never);
    renderPage('203.0.113.7');
    expect(await screen.findByText('Requests')).toBeDefined();
    expect(screen.getByText('400')).toBeDefined();
    expect(screen.getByText('28 GB')).toBeDefined();
  });

  it('renders a zero share when the fleet served nothing', async () => {
    mocks.fetchMetrics.mockResolvedValue({
      ...fixture,
      perIp: fixture.perIp.map((row) => ({ ...row, bytesOut: 0 })),
      totals: { ...fixture.totals, bytesOut: 0 },
    } as never);
    renderPage('203.0.113.7');
    expect(await screen.findByText('0.0%')).toBeDefined();
  });

  it('renders an empty state for an unknown IP', async () => {
    mocks.fetchMetrics.mockResolvedValue(fixture as never);
    renderPage('192.0.2.250');
    expect(await screen.findByText('No counters for this IP')).toBeDefined();
  });

  it('shows the token gate on a 401', async () => {
    mocks.fetchMetrics.mockRejectedValue(new ApiError(401));
    renderPage('203.0.113.7');
    expect(await screen.findByText('Metrics access')).toBeDefined();
  });

  it('stores the token and refetches when the 401 gate is submitted', async () => {
    mocks.fetchMetrics
      .mockRejectedValueOnce(new ApiError(401))
      .mockResolvedValueOnce(fixture as never);
    renderPage('203.0.113.7');
    const input = await screen.findByPlaceholderText('METRICS_TOKEN');
    fireEvent.change(input, { target: { value: 'fresh-token' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(sessionStorage.getItem('file-fly-metrics-token')).toBe('fresh-token');
    await waitFor(() => expect(mocks.fetchMetrics).toHaveBeenCalledTimes(2));
  });

});
