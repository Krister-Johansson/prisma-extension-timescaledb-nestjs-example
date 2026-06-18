import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { BucketRow } from '@/data/aggregates';

export function TableBuckets({ rows }: { rows: BucketRow[] }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-sm">
      <div className="px-5 pb-3 pt-4 text-sm font-semibold">Hourly buckets</div>
      {rows.length === 0 ? (
        <div className="px-5 pb-6 text-[12.5px] text-muted-foreground">
          No hourly rollups yet — they materialize as the continuous aggregate
          refreshes.
        </div>
      ) : (
        <div className="max-h-[420px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-surface-2 hover:bg-surface-2">
                <TableHead className="font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground">
                  Sensor
                </TableHead>
                <TableHead className="font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground">
                  Hour
                </TableHead>
                {(['Avg', 'Min', 'Max', 'N'] as const).map((h) => (
                  <TableHead
                    key={h}
                    className="text-right font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground"
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.sensor}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {b.hour}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {b.avg} {b.unit}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {b.min}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {b.max}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-2">
                    {b.count}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
