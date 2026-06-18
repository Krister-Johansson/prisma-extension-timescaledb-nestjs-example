import { Plus } from 'lucide-react';
import { useState } from 'react';
import { QueryError } from '@/components/common/query-error';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { SensorAlertRuleQuery } from '@/graphql/alert-rules.generated';
import type { SensorDetailQuery } from '@/graphql/sensors.generated';
import { AlertRuleDialog } from './alert-rule-dialog';
import { ConfigRuleCard } from './config-rule-card';

type LiveRule = NonNullable<SensorAlertRuleQuery['alertRule']>;
type DetailSensor = SensorDetailQuery['sensor'];

/** A sensor has at most one alert rule, so this shows the rule or an add prompt. */
export function ConfigRules({
  sensor,
  rule,
  loading,
  error,
}: {
  sensor: DetailSensor;
  rule: LiveRule | null;
  loading: boolean;
  error?: { message: string };
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <section>
      <h2 className="mb-3.5 text-sm font-semibold">Alert rule</h2>

      {loading ? (
        <Skeleton className="h-[120px] rounded-[12px]" />
      ) : error ? (
        <QueryError message={error.message} />
      ) : rule ? (
        <ConfigRuleCard rule={rule} unit={sensor.unit} />
      ) : (
        <div className="rounded-[12px] border border-dashed border-border p-11 text-center">
          <div className="text-sm font-semibold">No alert rule yet</div>
          <div className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
            This sensor is collecting data but won&apos;t raise alerts.
            <br />
            Add a rule to start monitoring it.
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
