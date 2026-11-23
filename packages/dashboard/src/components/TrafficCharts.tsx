import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { areaY, barY, defineChart } from '@tanstack/charts';
import { Chart } from '@tanstack/charts/react';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { scalePoint } from '@tanstack/charts/scales/point';
import { tooltip } from '@tanstack/charts/tooltip';
import { useMemo } from 'react';

import type { MetricsSnapshot } from '../lib/api.js';

import { formatHourBucket } from '../lib/format.js';

/** Props for the 24-hour traffic charts. */
export interface TrafficChartsProps {
  snapshot: MetricsSnapshot;
}

/**
 * Renders the requests and bytes traffic charts.
 * @param props - Snapshot supplying the 24-hour series.
 * @returns The rendered charts.
 */
export function TrafficCharts(props: TrafficChartsProps) {
  const { snapshot } = props;
  const series = useMemo(
    () =>
      (snapshot.last24h ?? []).map((point) => ({
        ...point,
        bytesOutGb: point.bytesOut / 1024 ** 3,
        hour: formatHourBucket(point.bucket),
      })),
    [snapshot.last24h],
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
  return (
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
  );
}
