import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatBucketLabel, type Resolution } from './chart-params';
import type { ReadingBucket } from './use-readings-buckets';

interface Row {
  bucketMs: number;
  label: string;
  avg: number | null;
  min: number | null;
  max: number | null;
  count: number;
}

const fmt = (n: number | null) => (n == null ? '—' : String(Math.round(n * 10) / 10));
const col = createColumnHelper<Row>();

export function DetailDataTable({
  buckets,
  res,
  unit,
  loading,
  error,
  tooMany,
}: {
  buckets: ReadingBucket[];
  res: Resolution;
  unit: string;
  loading: boolean;
  error?: Error;
  tooMany: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'time', desc: true },
  ]);
  const [filter, setFilter] = useState('');

  const rows = useMemo<Row[]>(
    () =>
      buckets.map((b) => ({
        bucketMs: Date.parse(b.bucket),
        label: formatBucketLabel(b.bucket, res),
        avg: b.avg,
        min: b.min,
        max: b.max,
        count: b.count,
      })),
    [buckets, res],
  );

  const columns = useMemo(
    () => [
      col.accessor('label', {
        id: 'time',
        header: 'Time',
        sortingFn: (a, b) => a.original.bucketMs - b.original.bucketMs,
        cell: (i) => <span className="font-mono">{i.getValue()}</span>,
      }),
      col.accessor('avg', {
        header: `Avg (${unit})`,
        cell: (i) => <span className="font-mono font-semibold">{fmt(i.getValue())}</span>,
      }),
      col.accessor('min', {
        header: 'Min',
        cell: (i) => <span className="font-mono text-muted-foreground">{fmt(i.getValue())}</span>,
      }),
      col.accessor('max', {
        header: 'Max',
        cell: (i) => <span className="font-mono text-muted-foreground">{fmt(i.getValue())}</span>,
      }),
      col.accessor('count', {
        header: 'Count',
        cell: (i) => <span className="font-mono text-muted-2">{i.getValue()}</span>,
      }),
    ],
    [unit],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const filteredRows = table.getRowModel().rows;

  return (
    <div className="rounded-[14px] border border-border bg-card p-4 shadow-sm">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <Input
          placeholder="Filter rows…"
          aria-label="Filter rows"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-8 w-[200px] text-[12.5px]"
        />
        <span className="font-mono text-[11px] text-muted-2">
          {filteredRows.length} {filteredRows.length === 1 ? 'row' : 'rows'}
        </span>
      </div>

      {tooMany ? (
        <div className="py-10 text-center text-[12.5px] text-muted-foreground">
          Too many buckets to list — narrow the range or coarsen the resolution.
        </div>
      ) : error ? (
        <div className="py-10 text-center text-[12.5px] text-alert">
          Couldn’t load readings: {error.message}
        </div>
      ) : (
        <div className="max-h-[360px] overflow-auto rounded-[10px] border border-border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="bg-surface-2 hover:bg-surface-2">
                  {hg.headers.map((h) => {
                    const sorted = h.column.getIsSorted();
                    return (
                      <TableHead
                        key={h.id}
                        className="font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground"
                      >
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sorted === 'asc' ? (
                            <ArrowUp className="size-3" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className="size-3" />
                          ) : (
                            <ChevronsUpDown className="size-3 opacity-40" />
                          )}
                        </button>
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-[12.5px] text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-[12.5px] text-muted-foreground">
                    No readings in this window.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="text-[12.5px]">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
