import { useQuery } from '@tanstack/react-query';

import { fetchMetrics } from './api.js';

/**
 * Polls the `/metrics` feed shared by every dashboard page.
 *
 * The query key, five-second interval and background refresh mirror the previous
 * per-page configuration. Retry stays disabled here, as the global QueryClient
 * already sets the same default; the next poll is the retry.
 * @returns The TanStack Query result for the metrics snapshot.
 */
export function useMetricsQuery() {
  return useQuery({
    queryFn: fetchMetrics,
    queryKey: ['metrics'],
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    retry: false,
  });
}
