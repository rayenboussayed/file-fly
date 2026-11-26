import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Link as TextLink } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';

import { formatBytes, formatCount, formatPercent } from '../lib/format.js';
import { useMetricsQuery } from '../lib/metrics-query.js';
import { KpiCard } from './kpi-card.js';
import { metricsGate } from './metrics-gate.js';

/**
 * Single client IP: its totals plus its share of the fleet's traffic.
 * @param properties - Component props.
 * @param properties.ip - The client IP to render.
 * @returns The IP detail page.
 */
export function IpDetailPage(properties: { ip: string }) {
  const { ip } = properties;
  const query = useMetricsQuery();

  const gate = metricsGate(query);
  if (gate) {
    return gate;
  }

  const snapshot = query.data;
  if (!snapshot) return;
  const entry = snapshot.perIp.find((row) => row.ip === ip);
  const fleetBytesOut = snapshot.totals.bytesOut || 1;

  return (
    <VStack gap={4}>
      <VStack gap={1}>
        <Text type="supporting">
          <TextLink href="/">Back to overview</TextLink>
        </Text>
        <Heading level={2}>
          <Text hasTabularNumbers type="display-3">
            {ip}
          </Text>
        </Heading>
      </VStack>

      {entry ? (
        <>
          <Grid columns={6} gap={2}>
            <KpiCard label="Requests" value={formatCount(entry.requests)} />
            <KpiCard label="Files in" value={formatCount(entry.filesIn)} />
            <KpiCard label="Files out" value={formatCount(entry.filesOut)} />
            <KpiCard label="GB in" value={formatBytes(entry.bytesIn)} />
            <KpiCard label="GB out" value={formatBytes(entry.bytesOut)} />
            <KpiCard
              label="Share of bytes out"
              value={formatPercent(entry.bytesOut / fleetBytesOut)}
            />
          </Grid>
          <Text type="supporting">
            Counters cover the retained window (default 35 days). The per-IP
            table is capped at the 50 heaviest clients by bytes out; ips beyond
            the cap show as missing here.
          </Text>
        </>
      ) : (
        <EmptyState
          description="This client has not made any retained requests, or is not present in the top-50 by bytes out."
          title="No counters for this IP"
        />
      )}
    </VStack>
  );
}
