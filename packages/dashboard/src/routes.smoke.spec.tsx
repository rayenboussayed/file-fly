import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import fixture from './test/fixtures/metrics.fixture.json';

const mocks = vi.hoisted(() => ({
  fetchMetrics: vi.fn<() => Promise<unknown>>(),
}));

vi.mock('./lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('./lib/api')>();
  return { ...original, fetchMetrics: mocks.fetchMetrics };
});

import { routeTree } from './routeTree.gen.js';

const renderAt = (initialPath: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    context: { queryClient },
    defaultPreload: false,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
    routeTree,
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  mocks.fetchMetrics.mockReset();
  mocks.fetchMetrics.mockResolvedValue(fixture as never);
});

describe('route tree (memory router)', () => {
  it('renders the overview at /', async () => {
    renderAt('/');
    expect(await screen.findByText('Metrics')).toBeDefined();
  });

  it('renders NotFound at an unknown path', async () => {
    renderAt('/no-such-page');
    expect(await screen.findByText('Page not found')).toBeDefined();
  });

  it('renders the ip detail page at /ip/:ip', async () => {
    renderAt('/ip/203.0.113.7');
    expect(await screen.findByText('Requests')).toBeDefined();
  });
});
