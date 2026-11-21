import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';

import { ApiError, setMetricsToken } from '../lib/api.js';
import { TokenGate } from './TokenGate.js';

/** Props for {@link MetricsErrorState}. */
export interface MetricsErrorStateProps {
  /** Error raised by the metrics query. */
  error: unknown;
  /** Called after a new token is stored so the query can retry. */
  onRefetch: () => void;
}

/**
 * Renders the failure state shared by both metrics pages.
 * @param props - Component props.
 * @param props.error - The query error, checked for an HTTP status.
 * @param props.onRefetch - Retries the query after a token is stored.
 * @returns The token gate or a generic error card.
 */
export function MetricsErrorState(props: MetricsErrorStateProps) {
  const { error, onRefetch } = props;
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
