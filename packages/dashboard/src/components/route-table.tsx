import type { TableColumn, TablePlugin } from '@astryxdesign/core/Table';

import { Table } from '@astryxdesign/core/Table';
import { useMemo } from 'react';

import type { MetricsRouteStat } from '../lib/api.js';

import { formatBytes, formatCount, formatMs } from '../lib/format.js';

/**
Props for the per-route traffic table.
 */
export interface RouteTableProperties {
  data: MetricsRouteStat[];
  sortPlugin: TablePlugin<MetricsRouteStat>;
}

/**
 * Renders the sortable per-route traffic table.
 * @param properties - Rows and sort plugin for the table.
 * @returns The rendered table.
 */
export function RouteTable(properties: RouteTableProperties) {
  const { data, sortPlugin } = properties;
  const columns = useMemo<TableColumn<MetricsRouteStat>[]>(
    () => [
      { header: 'Route', key: 'route', sortable: true },
      {
        align: 'end',
        header: 'Requests',
        key: 'requests',
        renderCell: (row: MetricsRouteStat) => formatCount(row.requests),
        sortable: true,
      },
      {
        align: 'end',
        header: 'Errors',
        key: 'errors',
        renderCell: (row: MetricsRouteStat) => formatCount(row.errors),
        sortable: true,
      },
      {
        align: 'end',
        header: 'avg',
        key: 'avgMs',
        renderCell: (row: MetricsRouteStat) => formatMs(row.avgMs),
        sortable: true,
      },
      {
        align: 'end',
        header: 'p50',
        key: 'p50',
        renderCell: (row: MetricsRouteStat) => formatMs(row.p50),
        sortable: true,
      },
      {
        align: 'end',
        header: 'p95',
        key: 'p95',
        renderCell: (row: MetricsRouteStat) => formatMs(row.p95),
        sortable: true,
      },
      {
        align: 'end',
        header: 'p99',
        key: 'p99',
        renderCell: (row: MetricsRouteStat) => formatMs(row.p99),
        sortable: true,
      },
      {
        align: 'end',
        header: 'GB out',
        key: 'bytesOut',
        renderCell: (row: MetricsRouteStat) => formatBytes(row.bytesOut),
        sortable: true,
      },
    ],
    [],
  );
  return (
    <Table
      columns={columns}
      data={data}
      hasHover
      idKey="route"
      isStriped
      plugins={{ sort: sortPlugin }}
    />
  );
}
