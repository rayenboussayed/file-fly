import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { useState } from 'react';

/**
Props for {@link TokenGate}.
 */
export interface TokenGateProperties {
  /**
  Called with the entered token; the parent stores it and refetches.
   */
  onSubmit: (token: string) => void;
  /**
  The HTTP status that led here (401 or 503).
   */
  reason: 401 | 503;
}

/**
 * Shown when the backend refuses `/metrics`.
 *
 * Two cases: 401 (the operator configured `METRICS_TOKEN`), where the user
 * enters that token once per tab; and 503 (production without `METRICS_TOKEN`),
 * which is a server misconfiguration the visitor cannot fix.
 * @param properties - Gate props.
 * @param properties.reason - The HTTP status that led here (401 or 503).
 * @param properties.onSubmit - Called with the entered token; the parent stores it and refetches.
 * @returns The gate element.
 */
export function TokenGate(properties: TokenGateProperties) {
  const { onSubmit, reason } = properties;
  const [value, setValue] = useState('');

  if (reason === 503) {
    return (
      <Card>
        <VStack gap={2}>
          <Text type="large">Metrics are disabled</Text>
          <Text>
            The server refuses to expose /metrics in production without
            METRICS_TOKEN. Ask whoever operates this file-fly instance to
            configure it.
          </Text>
        </VStack>
      </Card>
    );
  }

  return (
    <Card>
      <VStack gap={2}>
        <Text type="large">Metrics access</Text>
        <Text>
          This instance protects /metrics with a bearer token. Enter it once; it
          stays in this tab only.
        </Text>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const token = value.trim();
            if (token.length === 0) return;
            onSubmit(token);
            setValue('');
          }}
        >
          <FormLayout>
            <TextInput
              hasAutoFocus
              label="Token"
              onChange={(next) => setValue(next)}
              placeholder="METRICS_TOKEN"
              type="password"
              value={value}
            />
            <Button
              isDisabled={value.trim().length === 0}
              label="Unlock"
              type="submit"
              variant="primary"
            />
          </FormLayout>
        </form>
      </VStack>
    </Card>
  );
}
