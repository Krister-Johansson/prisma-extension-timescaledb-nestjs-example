import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { RelativeTime } from '@/components/common/relative-time';
import { SensorStatusBadge } from '@/components/sensor/sensor-status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ruleSummary } from '@/data/sensors';
import type { Sensor } from '@/data/types';
import { useRowLinkProps } from '@/lib/navigation';
import { routes } from '@/lib/routes';
import { ManageRowActions } from './manage-row-actions';

const column = createColumnHelper<Sensor>();

const columns = [
  column.accessor('name', {
    header: 'Sensor',
    cell: (info) => <span className="font-semibold">{info.getValue()}</span>,
  }),
  column.accessor('type', {
    header: 'Type',
    cell: (info) => (
      <span className="font-mono text-[11px] text-muted-foreground">
        {info.getValue()}
      </span>
    ),
  }),
  column.display({
    id: 'lastValue',
    header: 'Last value',
    cell: (info) => {
      const sensor = info.row.original;
      if (!sensor.latestAt) {
        return <span className="font-mono text-[12px] text-muted-2">No data</span>;
      }
      return (
        <div className="leading-tight">
          <div className="font-mono text-[12.5px] font-semibold">
            {sensor.latest} {sensor.unit}
          </div>
          <div className="font-mono text-[10.5px] text-muted-2">
            <RelativeTime iso={sensor.latestAt} />
          </div>
        </div>
      );
    },
  }),
  column.display({
    id: 'rules',
    header: 'Alert rules',
    cell: (info) => {
      const sensor = info.row.original;
      const count = sensor.ruleCount ?? (sensor.rule ? 1 : 0);
      const label =
        count === 0
          ? 'No rules'
          : count === 1
            ? `1 rule · ${ruleSummary(sensor)}`
            : `${count} rules`;
      return (
        <span
          className={
            count > 0
              ? 'font-mono text-[12px] text-muted-foreground'
              : 'font-mono text-[12px] text-muted-2'
          }
        >
          {label}
        </span>
      );
    },
  }),
  column.accessor('status', {
    header: 'Status',
    cell: (info) => <SensorStatusBadge status={info.getValue()} />,
  }),
  column.display({
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: (info) => (
      <div className="flex justify-end">
        <ManageRowActions sensor={info.row.original} />
      </div>
    ),
  }),
];

export function TableManage({ sensors }: { sensors: Sensor[] }) {
  const rowLink = useRowLinkProps();
  const table = useReactTable({
    data: sensors,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="bg-surface-2 hover:bg-surface-2">
              {group.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground"
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              {...rowLink(routes.sensors.detail(row.original.id))}
              className="cursor-pointer focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="py-3.5">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
