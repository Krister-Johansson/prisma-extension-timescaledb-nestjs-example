import { Button } from '@/components/ui/button';
import type { AlertRule } from '@/data/types';
import { cn } from '@/lib/utils';

export function ConfigRuleCard({
  rule,
  unit,
  enabled,
}: {
  rule: AlertRule;
  unit: string;
  enabled: boolean;
}) {
  return (
    <div className="rounded-[12px] border border-border bg-card p-4 shadow-sm">
      <div className="mb-2.5 flex items-center justify-between gap-2.5">
        <span className="text-sm font-semibold">
          {rule.direction === 'ABOVE' ? 'Above' : 'Below'} {rule.threshold}{' '}
          {unit}
        </span>
        <span
          className={cn(
            'rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold',
            enabled
              ? 'bg-ok-bg text-ok'
              : 'bg-surface-2 text-muted-foreground',
          )}
        >
          {enabled ? 'ACTIVE' : 'PAUSED'}
        </span>
      </div>
      <div className="font-mono text-[12px] text-muted-foreground">
        Reset at {rule.clearThreshold} {unit} · hysteresis band
      </div>
      <div className="mt-3.5 flex gap-2 border-t border-border pt-3.5">
        <Button variant="outline" size="sm">
          Edit rule
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-[color-mix(in_srgb,var(--alert)_35%,var(--border))] text-alert hover:text-alert"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
