import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ruleSummary, typeChip } from '@/data/sensors';
import type { Sensor } from '@/data/types';
import { useRowLinkProps } from '@/lib/navigation';
import { routes } from '@/lib/routes';
import { SensorStatusBadge } from './sensor-status-badge';
import { TableSensorEmpty } from './table-sensor-empty';

const column = createColumnHelper<Sensor>();

const columns = [
  column.accessor('name', {
    header: 'Sensor',
    cell: (info) => (
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-[30px] flex-none items-center justify-center rounded-lg border border-border bg-surface-2 font-mono text-[12.5px] font-semibold text-muted-foreground">
          {typeChip(info.row.original.type)}
        </div>
        <span className="font-semibold">{info.getValue()}</span>
      </div>
    ),
  }),
  column.accessor('type', {
    header: 'Type',
    cell: (info) => (
      <span className="font-mono text-[11px] text-muted-foreground">
        {info.getValue()}
      </span>
    ),
  }),
  column.accessor('latest', {
    header: () => <div className="text-right">Latest</div>,
    cell: (info) => (
      <div className="text-right font-mono font-semibold">
        {info.getValue()}{' '}
        <span className="font-normal text-muted-2">
          {info.row.original.unit}
        </span>
      </div>
    ),
  }),
  column.display({
    id: 'rule',
    header: 'Alert rule',
    cell: (info) => (
      <span className="font-mono text-[12px] text-muted-foreground">
        {ruleSummary(info.row.original)}
      </span>
    ),
  }),
  column.accessor('status', {
    header: () => <div className="text-right">Status</div>,
    cell: (info) => (
      <div className="flex justify-end">
        <SensorStatusBadge status={info.getValue()} />
      </div>
    ),
  }),
];

export function TableSensor({ sensors }: { sensors: Sensor[] }) {
  const rowLink = useRowLinkProps();
  const table = useReactTable({
    data: sensors,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (sensors.length === 0) {
    return (
      <div className="rounded-[14px] border border-border bg-card shadow-sm">
        <TableSensorEmpty />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="bg-surface-2 hover:bg-surface-2">
              {group.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="font-mono text-[10.5px] tracking-wide text-muted-foreground uppercase"
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
              className="cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="py-3">
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
