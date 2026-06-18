import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { SensorAlertRuleQuery } from '@/graphql/alert-rules.generated';
import { cn } from '@/lib/utils';
import { AlertRuleDeleteDialog } from './alert-rule-delete-dialog';
import { AlertRuleDialog } from './alert-rule-dialog';
import { AlertRuleToggle } from './alert-rule-toggle';

type LiveRule = NonNullable<SensorAlertRuleQuery['alertRule']>;

/** Live alert-rule card: summary + edit / enable-disable / delete. */
export function AlertRuleCard({ rule, unit }: { rule: LiveRule; unit: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="rounded-[12px] border border-border bg-card p-4 shadow-sm">
      <div className="mb-2.5 flex items-center justify-between gap-2.5">
        <span className="text-sm font-semibold">
          {rule.direction === 'ABOVE' ? 'Above' : 'Below'} {rule.threshold} {unit}
        </span>
        <span
          className={cn(
            'rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold',
            rule.enabled
              ? 'bg-ok-bg text-ok'
              : 'bg-surface-2 text-muted-foreground',
          )}
        >
          {rule.enabled ? 'ACTIVE' : 'PAUSED'}
        </span>
      </div>
      <div className="font-mono text-[12px] text-muted-foreground">
        Reset at {rule.clearThreshold} {unit} · {rule.severity.toLowerCase()} ·
        hysteresis band
      </div>
      <div className="mt-3.5 flex gap-2 border-t border-border pt-3.5">
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          Edit rule
        </Button>
        <AlertRuleToggle rule={rule} />
        <Button
          variant="outline"
          size="sm"
          className="ml-auto border-[color-mix(in_srgb,var(--alert)_35%,var(--border))] text-alert hover:text-alert"
          onClick={() => setDeleteOpen(true)}
        >
          Delete
        </Button>
      </div>

      <AlertRuleDialog
        sensorId={rule.sensorId}
        unit={unit}
        rule={rule}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <AlertRuleDeleteDialog
        sensorId={rule.sensorId}
        ruleId={rule.id}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}
