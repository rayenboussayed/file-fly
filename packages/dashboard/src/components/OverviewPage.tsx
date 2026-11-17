import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import {
  Table,
  useTableSortable,
  useTableSortableState,
} from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { areaY, barY, defineChart } from '@tanstack/charts';
import { Chart } from '@tanstack/charts/react';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { scalePoint } from '@tanstack/charts/scales/point';
import { tooltip } from '@tanstack/charts/tooltip';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { MetricsPerIp, MetricsRouteStat } from '../lib/api.js';

import { ApiError, fetchMetrics, setMetricsToken } from '../lib/api.js';
import {
  formatBytes,
  formatCount,
  formatHourBucket,
  formatMs,
  formatPercent,
} from '../lib/format.js';
import { KpiCard } from './KpiCard.js';
import { TokenGate } from './TokenGate.js';

type IpRow = MetricsPerIp;
type RouteRow = MetricsRouteStat;

const ipComparators = {
  bytesIn: (a: IpRow, b: IpRow) => a.bytesIn - b.bytesIn,
  bytesOut: (a: IpRow, b: IpRow) => a.bytesOut - b.bytesOut,
  filesIn: (a: IpRow, b: IpRow) => a.filesIn - b.filesIn,
  filesOut: (a: IpRow, b: IpRow) => a.filesOut - b.filesOut,
  requests: (a: IpRow, b: IpRow) => a.requests - b.requests,
};

const routeComparators = {
  avgMs: (a: RouteRow, b: RouteRow) => a.avgMs - b.avgMs,
  bytesOut: (a: RouteRow, b: RouteRow) => a.bytesOut - b.bytesOut,
  errors: (a: RouteRow, b: RouteRow) => a.errors - b.errors,
  p50: (a: RouteRow, b: RouteRow) => a.p50 - b.p50,
  p95: (a: RouteRow, b: RouteRow) => a.p95 - b.p95,
  p99: (a: RouteRow, b: RouteRow) => a.p99 - b.p99,
  requests: (a: RouteRow, b: RouteRow) => a.requests - b.requests,
};

/**
 * Polls `/metrics` every 5 seconds and renders the fleet-wide overview.
 * @returns The overview page.
 */
export function OverviewPage() {
  const query = useQuery({
    queryFn: fetchMetrics,
    queryKey: ['metrics'],
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  const snapshot = query.data;
  const ipState = useTableSortableState<IpRow>({
    comparators: ipComparators,
    data: snapshot?.perIp ?? [],
    defaultSort: [{ direction: 'descending', sortKey: 'bytesOut' }],
  });
  const ipSort = useTableSortable<IpRow>(ipState.sortConfig);
  const routeState = useTableSortableState<RouteRow>({
    comparators: routeComparators,
    data: snapshot?.perRoute ?? [],
    defaultSort: [{ direction: 'descending', sortKey: 'requests' }],
  });
  const routeSort = useTableSortable<RouteRow>(routeState.sortConfig);

  const series = useMemo(
    () =>
      (snapshot?.last24h ?? []).map((point) => ({
        ...point,
        bytesOutGb: point.bytesOut / 1024 ** 3,
        hour: formatHourBucket(point.bucket),
      })),
    [snapshot?.last24h],
  );
  const requestsChart = useMemo(
    () =>
      defineChart({
        marks: [areaY(series, { x: 'hour', y: 'requests' })],
        scales: {
          x: { scale: () => scalePoint<string>().padding(0.4) },
          y: {
            axis: { label: 'Requests' },
            grid: true,
            nice: true,
            scale: scaleLinear,
          },
        },
        tooltip,
      }),
    [series],
  );
  const bytesChart = useMemo(
    () =>
      defineChart({
        marks: [barY(series, { x: 'hour', y: 'bytesOutGb' })],
        scales: {
          x: { scale: () => scalePoint<string>().padding(0.4) },
          y: {
            axis: { label: 'Bytes out / hour' },
            grid: true,
            nice: true,
            scale: scaleLinear,
          },
        },
        tooltip,
      }),
    [series],
  );

  if (query.isError) {
    const status = query.error instanceof ApiError ? query.error.status : 0;
    if (status === 401 || status === 503) {
      return (
        <TokenGate
          onSubmit={(token) => {
            setMetricsToken(token);
            void query.refetch();
          }}
          reason={status}
        />
      );
    }
    return (
      <Card>
        <VStack gap={2}>
          <Text type="large">Could not load metrics</Text>
          <Text>{query.error.message}</Text>
        </VStack>
      </Card>
    );
  }

  if (query.isPending || !snapshot) {
    return (
      <Card>
        <Text>Loading metrics…</Text>
      </Card>
    );
  }

  const { today, totals } = snapshot;
  const errorRate =
    totals.requests === 0
      ? 0
      : (totals.clientErrors + totals.serverErrors) / totals.requests;

  return (
    <VStack gap={4}>
      <VStack gap={1}>
        <Heading level={2}>Metrics</Heading>
        <Text hasTabularNumbers type="supporting">
          {`uptime ${formatMs(snapshot.uptimeSeconds * 1000)} · updated ${new Date(snapshot.generatedAt).toLocaleTimeString()}${snapshot.metricsDisabled ? ' · store disabled' : ''}`}
        </Text>
        {snapshot.metricsDisabled ? (
          <Badge label="metrics store disabled" variant="warning" />
        ) : null}
      </VStack>

      <Grid columns={6} gap={2}>
        <KpiCard label="In-flight now" value={formatCount(snapshot.inFlight)} />
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

      <Grid columns={2} gap={2}>
        <Card>
          <VStack gap={2}>
            <Text type="large">Requests (24h)</Text>
            <Chart
              ariaLabel="Requests per hour, last 24 hours"
              definition={requestsChart}
              height={220}
            />
          </VStack>
        </Card>
        <Card>
          <VStack gap={2}>
            <Text type="large">GB transferred out per hour (24h)</Text>
            <Chart
              ariaLabel="Bytes served per hour, last 24 hours"
              definition={bytesChart}
              height={220}
            />
          </VStack>
        </Card>
      </Grid>

      <VStack gap={2}>
        <Heading level={3}>By client IP</Heading>
        <Table
          columns={[
            {
              header: 'IP',
              key: 'ip',
              renderCell: (row: IpRow) => (
                <Link href={`/ip/${encodeURIComponent(row.ip)}`}>{row.ip}</Link>
              ),
              sortable: true,
            },
            {
              align: 'end',
              header: 'Requests',
              key: 'requests',
              renderCell: (row: IpRow) => formatCount(row.requests),
              sortable: true,
            },
            {
              align: 'end',
              header: 'Files in',
              key: 'filesIn',
              renderCell: (row: IpRow) => formatCount(row.filesIn),
              sortable: true,
            },
            {
              align: 'end',
              header: 'Files out',
              key: 'filesOut',
              renderCell: (row: IpRow) => formatCount(row.filesOut),
              sortable: true,
            },
            {
              align: 'end',
              header: 'GB in',
              key: 'bytesIn',
              renderCell: (row: IpRow) => formatBytes(row.bytesIn),
              sortable: true,
            },
            {
              align: 'end',
              header: 'GB out',
              key: 'bytesOut',
              renderCell: (row: IpRow) => formatBytes(row.bytesOut),
              sortable: true,
            },
          ]}
          data={ipState.sortedData}
          hasHover
          idKey="ip"
          isStriped
          plugins={{ sort: ipSort }}
        />
      </VStack>

      <VStack gap={2}>
        <Heading level={3}>By route</Heading>
        <Table
          columns={[
            { header: 'Route', key: 'route', sortable: true },
            {
              align: 'end',
              header: 'Requests',
              key: 'requests',
              renderCell: (row: RouteRow) => formatCount(row.requests),
              sortable: true,
            },
            {
              align: 'end',
              header: 'Errors',
              key: 'errors',
              renderCell: (row: RouteRow) => formatCount(row.errors),
              sortable: true,
            },
            {
              align: 'end',
              header: 'avg',
              key: 'avgMs',
              renderCell: (row: RouteRow) => formatMs(row.avgMs),
              sortable: true,
            },
            {
              align: 'end',
              header: 'p50',
              key: 'p50',
              renderCell: (row: RouteRow) => formatMs(row.p50),
              sortable: true,
            },
            {
              align: 'end',
              header: 'p95',
              key: 'p95',
              renderCell: (row: RouteRow) => formatMs(row.p95),
              sortable: true,
            },
            {
              align: 'end',
              header: 'p99',
              key: 'p99',
              renderCell: (row: RouteRow) => formatMs(row.p99),
              sortable: true,
            },
            {
              align: 'end',
              header: 'GB out',
              key: 'bytesOut',
              renderCell: (row: RouteRow) => formatBytes(row.bytesOut),
              sortable: true,
            },
          ]}
          data={routeState.sortedData}
          hasHover
          idKey="route"
          isStriped
          plugins={{ sort: routeSort }}
        />
      </VStack>
    </VStack>
  );
}
