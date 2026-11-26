import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';

import { ApiError, setMetricsToken } from '../lib/api.js';
import { TokenGate } from './token-gate.js';

/**
Props for {@link MetricsErrorState}.
 */
export interface MetricsErrorStateProperties {
  /**
  Error raised by the metrics query.
   */
  error: unknown;
  /**
  Called after a new token is stored so the query can retry.
   */
  onRefetch: () => void;
}

/**
 * Renders the failure state shared by both metrics pages.
 * @param properties - Component props.
 * @param properties.error - The query error, checked for an HTTP status.
 * @param properties.onRefetch - Retries the query after a token is stored.
 * @returns The token gate or a generic error card.
 */
export function MetricsErrorState(properties: MetricsErrorStateProperties) {
  const { error, onRefetch } = properties;
  const status = error instanceof ApiError ? error.status : 0;
  if (status === 401 || status === 503) {
    return (
      <TokenGate
        onSubmit={(token) => {
          setMetricsToken(token);
          onRefetch();
        }}
        reason={status}
      />
    );
  }
  const message = error instanceof Error ? error.message : 'The metrics request failed.';
  return (
    <Card role="alert">
      <VStack gap={2}>
        <Text type="large">Could not load metrics</Text>
        <Text>{message}</Text>
      </VStack>
    </Card>
  );
}
