import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../lib/api.js';
import fixture from '../test/fixtures/metrics.fixture.json';

const mocks = vi.hoisted(() => ({
  fetchMetrics: vi.fn<() => Promise<unknown>>(),
  setMetricsToken: vi.fn(),
}));

vi.mock('../lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/api')>();
  return {
    ...original,
    fetchMetrics: mocks.fetchMetrics,
    setMetricsToken: mocks.setMetricsToken,
  };
});

import { OverviewPage } from './OverviewPage.js';

const snapshot = fixture as never;

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <OverviewPage />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  sessionStorage.clear();
  mocks.fetchMetrics.mockReset();
  mocks.setMetricsToken.mockReset();
});

describe('OverviewPage', () => {
  it('renders the KPIs, tables and charts from the snapshot', async () => {
    mocks.fetchMetrics.mockResolvedValue(snapshot);
    renderPage();
    expect(await screen.findByText('In-flight now')).toBeDefined();
    expect(await screen.findByText('203.0.113.7')).toBeDefined();
    expect(screen.getByText('/image')).toBeDefined();
    expect(screen.getByText('1,204')).toBeDefined();
    expect(screen.getByText('5.0 GB / 50 GB')).toBeDefined();
  });

  it('shows a loading card while the query is pending', () => {
    mocks.fetchMetrics.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading metrics…')).toBeDefined();
  });

  it('sorts every sortable column interactively', async () => {
    mocks.fetchMetrics.mockResolvedValue(snapshot);
    renderPage();
    expect(await screen.findByText('203.0.113.7')).toBeDefined();
    for (const label of [
      'Requests',
      'Files in',
      'Files out',
      'GB in',
      'GB out',
    ]) {
      const [control] = screen.getAllByRole('button', { name: label });
      fireEvent.click(control as HTMLElement);
      fireEvent.click(control as HTMLElement);
    }
    for (const label of ['Errors', 'avg', 'p50', 'p95', 'p99']) {
      const [control] = screen.getAllByRole('button', { name: label });
      fireEvent.click(control as HTMLElement);
      fireEvent.click(control as HTMLElement);
    }
    expect(screen.getByText('203.0.113.7')).toBeDefined();
  });

  it('shows the token gate and forwards the submitted token on 401', async () => {
    mocks.fetchMetrics.mockRejectedValue(new ApiError(401));
    renderPage();
    expect(await screen.findByText('Metrics access')).toBeDefined();
    fireEvent.change(screen.getByPlaceholderText('METRICS_TOKEN'), {
      target: { value: 'secret-token' },
    });
    const input = screen.getByPlaceholderText('METRICS_TOKEN');
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(mocks.setMetricsToken).toHaveBeenCalledWith('secret-token');
  });

  it('shows the disabled screen on 503', async () => {
    mocks.fetchMetrics.mockRejectedValue(new ApiError(503));
    renderPage();
    expect(await screen.findByText('Metrics are disabled')).toBeDefined();
  });

  it('shows a generic error on unexpected failures', async () => {
    mocks.fetchMetrics.mockRejectedValue(new Error('network down'));
    renderPage();
    expect(await screen.findByText('Could not load metrics')).toBeDefined();
    expect(screen.getByText('network down')).toBeDefined();
  });
});
