import type { ReactElement } from 'react';

import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';

import { useMetricsQuery } from '../lib/metrics-query.js';
import { MetricsErrorState } from './metrics-error-state.js';

type MetricsQueryResult = ReturnType<typeof useMetricsQuery>;

/**
 * Shared loading/error gate for the metrics pages.
 * @param query - The metrics query result.
 * @returns The gate element, or undefined when data is available.
 */
export function metricsGate(query: MetricsQueryResult): ReactElement | undefined {
  if (query.isError) {
    return (
      <MetricsErrorState error={query.error} onRefetch={() => { void query.refetch(); }} />
    );
  }
  if (query.isPending || !query.data) {
    return (
      <Card role="status">
        <Text>Loading metrics…</Text>
      </Card>
    );
  }
  return undefined;
}
