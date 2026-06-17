import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { recentReadings } from '@/data/detail';
import type { Sensor } from '@/data/types';
import { cn } from '@/lib/utils';

export function TableReadings({ sensor }: { sensor: Sensor }) {
  const rows = recentReadings(sensor);
  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-sm">
      <div className="px-5 pb-3 pt-4 text-sm font-semibold">
        Recent raw readings
      </div>
      <div className="max-h-[300px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-2 hover:bg-surface-2">
              <TableHead className="font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground">
                Time
              </TableHead>
              <TableHead className="text-right font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground">
                Value
              </TableHead>
              <TableHead className="text-right font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground">
                Δ
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.ts}>
                <TableCell className="font-mono text-muted-foreground">
                  {r.time}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {r.value}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right font-mono',
                    r.delta > 0
                      ? 'text-alert'
                      : r.delta < 0
                        ? 'text-ok'
                        : 'text-muted-2',
                  )}
                >
                  {r.delta > 0 ? `+${r.delta}` : r.delta}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
