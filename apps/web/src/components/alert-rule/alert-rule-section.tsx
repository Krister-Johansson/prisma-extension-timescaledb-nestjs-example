import { useQuery } from '@apollo/client/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { SensorStatusBadge } from '@/components/sensor/sensor-status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { SensorStatus } from '@/data/types';
import {
  type SensorAlertRuleQuery,
  SensorAlertRuleDocument,
} from '@/graphql/alert-rules.generated';
import { AlertRuleCard } from './alert-rule-card';
import { AlertRuleDialog } from './alert-rule-dialog';

type LiveRule = NonNullable<SensorAlertRuleQuery['alertRule']>;

function ruleStatus(rule: LiveRule | null): SensorStatus {
  if (!rule) return 'NO_RULES';
  if (!rule.enabled) return 'PAUSED';
  return rule.state === 'ALERTING' ? 'ALERTING' : 'OK';
}

/**
 * Full alert-rule management for a sensor (one rule per sensor): loads the rule
 * and renders the card (edit / enable-disable / delete) or an add prompt. Lives
 * on the sensor detail page.
 */
export function AlertRuleSection({
  sensor,
}: {
  sensor: { id: string; unit: string };
}) {
  const { data, loading, error } = useQuery(SensorAlertRuleDocument, {
    variables: { sensorId: sensor.id },
    context: { suppressErrorToast: true },
  });
  const rule = data?.alertRule ?? null;
  const loadError = Boolean(error) && !data;
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <section>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Alert rule</h3>
        {!loading && !loadError && rule ? (
          <SensorStatusBadge status={ruleStatus(rule)} />
        ) : null}
      </div>

      {loading && !data ? (
        <Skeleton className="h-[120px] rounded-[12px]" />
      ) : loadError ? (
        <div className="text-[12.5px] text-muted-foreground">
          Couldn&apos;t load the alert rule.
        </div>
      ) : rule ? (
        <AlertRuleCard rule={rule} unit={sensor.unit} />
      ) : (
        <div className="rounded-[12px] border border-dashed border-border p-8 text-center">
          <div className="text-sm font-semibold">No alert rule yet</div>
          <div className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
            This sensor is collecting data but won&apos;t raise alerts.
          </div>
          <Button
            size="sm"
            className="mt-4 gap-1.5"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" />
            Add rule
          </Button>
        </div>
      )}

      <AlertRuleDialog
        sensorId={sensor.id}
        unit={sensor.unit}
        rule={null}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </section>
  );
}
