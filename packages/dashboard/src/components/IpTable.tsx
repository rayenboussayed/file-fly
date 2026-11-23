import type { TableColumn, TablePlugin } from '@astryxdesign/core/Table';

import { Link } from '@astryxdesign/core/Link';
import { Table } from '@astryxdesign/core/Table';
import { useMemo } from 'react';

import type { MetricsPerIp } from '../lib/api.js';

import { formatBytes, formatCount } from '../lib/format.js';

/** Props for the per-IP traffic table. */
export interface IpTableProps {
  data: MetricsPerIp[];
  sortPlugin: TablePlugin<MetricsPerIp>;
}

/**
 * Renders the sortable per-IP traffic table.
 * @param props - Rows and sort plugin for the table.
 * @returns The rendered table.
 */
export function IpTable(props: IpTableProps) {
  const { data, sortPlugin } = props;
  const columns = useMemo<TableColumn<MetricsPerIp>[]>(
    () => [
      {
        header: 'IP',
        key: 'ip',
        renderCell: (row: MetricsPerIp) => (
          <Link href={`/ip/${encodeURIComponent(row.ip)}`}>{row.ip}</Link>
        ),
        sortable: true,
      },
      {
        align: 'end',
        header: 'Requests',
        key: 'requests',
        renderCell: (row: MetricsPerIp) => formatCount(row.requests),
        sortable: true,
      },
      {
        align: 'end',
        header: 'Files in',
        key: 'filesIn',
        renderCell: (row: MetricsPerIp) => formatCount(row.filesIn),
        sortable: true,
      },
      {
        align: 'end',
        header: 'Files out',
        key: 'filesOut',
        renderCell: (row: MetricsPerIp) => formatCount(row.filesOut),
        sortable: true,
      },
      {
        align: 'end',
        header: 'GB in',
        key: 'bytesIn',
        renderCell: (row: MetricsPerIp) => formatBytes(row.bytesIn),
        sortable: true,
      },
      {
        align: 'end',
        header: 'GB out',
        key: 'bytesOut',
        renderCell: (row: MetricsPerIp) => formatBytes(row.bytesOut),
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
      idKey="ip"
      isStriped
      plugins={{ sort: sortPlugin }}
    />
  );
}
