import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { alertHistory } from '@/data/detail';
import type { Sensor } from '@/data/types';
import { cn } from '@/lib/utils';

export function DetailAlertHistory({ sensor }: { sensor: Sensor }) {
  const events = alertHistory(sensor);

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-sm">
      <div className="px-5 pb-3 pt-4 text-sm font-semibold">
        Alert history · last 24h
      </div>

      {events.length === 0 ? (
        <div className="px-5 pb-12 pt-2 text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-ok-bg">
            <span className="size-3.5 rounded-full bg-ok" />
          </div>
          <div className="text-[13.5px] font-semibold">
            No alerts in the last 24h
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            This sensor stayed within its threshold band the entire window.
          </div>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-2 hover:bg-surface-2">
              <TableHead className="font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground">
                Event
              </TableHead>
              <TableHead className="font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground">
                Time
              </TableHead>
              <TableHead className="text-right font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground">
                Value
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-wide',
                      e.kind === 'RAISED'
                        ? 'bg-alert-bg text-alert'
                        : 'bg-ok-bg text-ok',
                    )}
                  >
                    {e.kind}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-muted-foreground">
                  {e.time}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {e.value} {sensor.unit}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
