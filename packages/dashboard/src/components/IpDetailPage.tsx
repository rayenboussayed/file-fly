import { Card } from '@astryxdesign/core/Card';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Link as TextLink } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useQuery } from '@tanstack/react-query';

import { fetchMetrics } from '../lib/api.js';
import { formatBytes, formatCount, formatPercent } from '../lib/format.js';
import { KpiCard } from './KpiCard.js';
import { MetricsErrorState } from './MetricsErrorState.js';

/**
 * Single client IP: its totals plus its share of the fleet's traffic.
 * @param props - Component props.
 * @param props.ip - The client IP to render.
 * @returns The IP detail page.
 */
export function IpDetailPage(props: { ip: string }) {
  const { ip } = props;
  const query = useQuery({
    queryFn: fetchMetrics,
    queryKey: ['metrics'],
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  const snapshot = query.data;
  if (query.isError) {
    return (
      <MetricsErrorState error={query.error} onRefetch={() => { void query.refetch(); }} />
    );
  }

  if (query.isPending || !snapshot) {
    return (
      <Card>
        <Text>Loading metrics…</Text>
      </Card>
    );
  }

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
