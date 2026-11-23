import { Badge } from '@astryxdesign/core/Badge';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { useTableSortable, useTableSortableState } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';

import type { MetricsPerIp, MetricsRouteStat } from '../lib/api.js';

import {
  formatBytes,
  formatCount,
  formatMs,
  formatPercent,
} from '../lib/format.js';
import { useMetricsQuery } from '../lib/metrics-query.js';
import { IpTable } from './IpTable.js';
import { KpiCard } from './KpiCard.js';
import { metricsGate } from './MetricsGate.js';
import { RouteTable } from './RouteTable.js';
import { TrafficCharts } from './TrafficCharts.js';

const ipComparators = {
  bytesIn: (a: MetricsPerIp, b: MetricsPerIp) => a.bytesIn - b.bytesIn,
  bytesOut: (a: MetricsPerIp, b: MetricsPerIp) => a.bytesOut - b.bytesOut,
  filesIn: (a: MetricsPerIp, b: MetricsPerIp) => a.filesIn - b.filesIn,
  filesOut: (a: MetricsPerIp, b: MetricsPerIp) => a.filesOut - b.filesOut,
  requests: (a: MetricsPerIp, b: MetricsPerIp) => a.requests - b.requests,
};

const routeComparators = {
  avgMs: (a: MetricsRouteStat, b: MetricsRouteStat) => a.avgMs - b.avgMs,
  bytesOut: (a: MetricsRouteStat, b: MetricsRouteStat) => a.bytesOut - b.bytesOut,
  errors: (a: MetricsRouteStat, b: MetricsRouteStat) => a.errors - b.errors,
  p50: (a: MetricsRouteStat, b: MetricsRouteStat) => a.p50 - b.p50,
  p95: (a: MetricsRouteStat, b: MetricsRouteStat) => a.p95 - b.p95,
  p99: (a: MetricsRouteStat, b: MetricsRouteStat) => a.p99 - b.p99,
  requests: (a: MetricsRouteStat, b: MetricsRouteStat) => a.requests - b.requests,
};

/**
 * Polls `/metrics` every 5 seconds and renders the fleet-wide overview.
 * @returns The overview page.
 */
export function OverviewPage() {
  const query = useMetricsQuery();

  const snapshot = query.data;
  const ipState = useTableSortableState<MetricsPerIp>({
    comparators: ipComparators,
    data: snapshot?.perIp ?? [],
    defaultSort: [{ direction: 'descending', sortKey: 'bytesOut' }],
  });
  const ipSort = useTableSortable<MetricsPerIp>(ipState.sortConfig);
  const routeState = useTableSortableState<MetricsRouteStat>({
    comparators: routeComparators,
    data: snapshot?.perRoute ?? [],
    defaultSort: [{ direction: 'descending', sortKey: 'requests' }],
  });
  const routeSort = useTableSortable<MetricsRouteStat>(routeState.sortConfig);

  const gate = metricsGate(query);
  if (gate) {
    return gate;
  }

  const snap = query.data;
  if (!snap) return null;
  const { today, totals } = snap;
  const errorRate =
    totals.requests === 0
      ? 0
      : (totals.clientErrors + totals.serverErrors) / totals.requests;

  const uptimeText = `uptime ${formatMs(snap.uptimeSeconds * 1000)} · updated ${new Date(snap.generatedAt).toLocaleTimeString()}${snap.metricsDisabled ? ' · store disabled' : ''}`;

  return (
    <VStack gap={4}>
      <VStack gap={1}>
        <Heading level={2}>Metrics</Heading>
        <Text hasTabularNumbers type="supporting">
          {uptimeText}
        </Text>
        {snap.metricsDisabled ? (
          <Badge label="metrics store disabled" variant="warning" />
        ) : null}
      </VStack>

      <Grid columns={6} gap={2}>
        <KpiCard label="In-flight now" value={formatCount(snap.inFlight)} />
        <KpiCard
          label="Requests (all time)"
          supporting={`${formatCount(today.requests)} today`}
          value={formatCount(totals.requests)}
        />
        <KpiCard
          label="Files in / out"
          value={`${formatCount(totals.filesIn)} / ${formatCount(totals.filesOut)}`}
        />
        <KpiCard
          label="GB in / out (all time)"
          supporting={`${formatBytes(today.bytesIn)} / ${formatBytes(today.bytesOut)} today`}
          value={`${formatBytes(totals.bytesIn)} / ${formatBytes(totals.bytesOut)}`}
        />
        <KpiCard
          label="Error rate"
          supporting={`${formatCount(totals.clientErrors)} 4xx · ${formatCount(totals.serverErrors)} 5xx`}
          value={formatPercent(errorRate)}
        />
        <KpiCard
          label="Cache hit rate"
          supporting={`${formatCount(totals.cacheHits)} hits · ${formatCount(totals.cacheMisses)} misses`}
          value={formatPercent(totals.cacheHitRate)}
        />
      </Grid>

      <TrafficCharts snapshot={snap} />

      <VStack gap={2}>
        <Heading level={3}>By client IP</Heading>
        <IpTable data={ipState.sortedData} sortPlugin={ipSort} />
      </VStack>

      <VStack gap={2}>
        <Heading level={3}>By route</Heading>
        <RouteTable data={routeState.sortedData} sortPlugin={routeSort} />
      </VStack>
    </VStack>
  );
}
