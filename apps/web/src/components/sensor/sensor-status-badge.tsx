import { cn } from '@/lib/utils';
import type { SensorStatus } from '@/data/types';

const META: Record<
  SensorStatus,
  { label: string; badge: string; dot: string; pulse?: boolean }
> = {
  OK: { label: 'OK', badge: 'bg-ok-bg text-ok', dot: 'bg-ok' },
  ALERTING: {
    label: 'ALERTING',
    badge: 'bg-alert-bg text-alert',
    dot: 'bg-alert',
    pulse: true,
  },
  WARNING: { label: 'WARNING', badge: 'bg-warn-bg text-warn', dot: 'bg-warn' },
  PAUSED: { label: 'PAUSED', badge: 'bg-surface-2 text-muted-foreground', dot: 'bg-muted-2' },
  NO_RULES: { label: 'NO RULES', badge: 'bg-surface-2 text-muted-foreground', dot: 'bg-muted-2' },
};

export function SensorStatusBadge({ status }: { status: SensorStatus }) {
  const meta = META[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wide',
        meta.badge,
      )}
    >
      <span
        className={cn(
          'size-[7px] rounded-full',
          meta.dot,
          meta.pulse && 'animate-pulse',
        )}
      />
      {meta.label}
    </span>
  );
}
