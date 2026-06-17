import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { eventLog } from '@/data/alerts';
import { cn } from '@/lib/utils';

export function TableEventLog() {
  const rows = eventLog();
  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-sm">
      <div className="max-h-[460px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-2 hover:bg-surface-2">
              <TableHead className="font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground">
                Sensor
              </TableHead>
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
            {rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.sensor}</TableCell>
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
                  {e.value} {e.unit}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
