import { Check, Undo2 } from 'lucide-react';
import { RelativeTime } from '@/components/common/relative-time';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AnomalySeverity } from '@/gql/schema-types';
import { useRowLinkProps } from '@/lib/navigation';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

export interface AnomalyRow {
  id: string;
  sensorId: string;
  sensor: string;
  unit: string;
  severity: AnomalySeverity;
  time: string;
  value: number;
  median: number;
  score: number;
  aiSummary?: string | null;
  acknowledgedAt?: string | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function TableAnomalyLog({
  rows,
  onAcknowledge,
  emptyMessage = 'No anomalies detected yet — log an out-of-range value on a sensor to try the detector.',
}: {
  rows: AnomalyRow[];
  onAcknowledge: (id: string, acknowledged: boolean) => void;
  emptyMessage?: string;
}) {
  const rowLink = useRowLinkProps();

  if (rows.length === 0) {
    return (
      <div className="rounded-[14px] border border-dashed border-border bg-card px-5 py-12 text-center text-[12.5px] text-muted-foreground shadow-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-sm">
      <div className="max-h-[560px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-2 hover:bg-surface-2">
              {['Sensor', 'Severity', 'Time'].map((h) => (
                <TableHead
                  key={h}
                  className="font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground"
                >
                  {h}
                </TableHead>
              ))}
              <TableHead className="text-right font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground">
                Value
              </TableHead>
              <TableHead className="text-right font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground">
                Score
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => {
              const critical = a.severity === 'CRITICAL';
              const dismissed = Boolean(a.acknowledgedAt);
              return (
                <TableRow
                  key={a.id}
                  {...rowLink(routes.sensors.detail(a.sensorId))}
                  className={cn(
                    'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                    dismissed && 'opacity-55',
                  )}
                >
                  <TableCell className="align-top font-medium">
                    <div className="mt-0.5">{a.sensor}</div>
                    {a.aiSummary && (
                      <div className="mt-1 max-w-[460px] whitespace-normal text-[11.5px] font-normal leading-snug text-balance text-muted-foreground">
                        {a.aiSummary}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-wide',
                        critical
                          ? 'bg-alert-bg text-alert'
                          : 'bg-warn-bg text-warn',
                      )}
                    >
                      <span
                        className={cn(
                          'size-1.5 rounded-full',
                          critical ? 'bg-alert' : 'bg-warn',
                        )}
                      />
                      {critical ? 'CRITICAL' : 'WARNING'}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-muted-foreground">
                    <RelativeTime iso={a.time} />
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {round1(a.value)} {a.unit}
                    <span className="ml-1 text-[11px] font-normal text-muted-2">
                      vs ~{round1(a.median)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {round1(a.score)}σ
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={dismissed ? 'Restore anomaly' : 'Dismiss anomaly'}
                      title={dismissed ? 'Restore' : 'Dismiss (mark reviewed)'}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onAcknowledge(a.id, !dismissed);
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {dismissed ? (
                        <Undo2 className="size-4" />
                      ) : (
                        <Check className="size-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
