import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
});
