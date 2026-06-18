import { useQuery } from '@apollo/client/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SensorAlertRulesDocument } from '@/graphql/alert-rules.generated';
import { AlertRuleCard } from './alert-rule-card';
import { AlertRuleDialog } from './alert-rule-dialog';

/**
 * Alert-rule management for a sensor. A sensor can have several rules (e.g. a
 * warning and a critical threshold): lists them as cards with "Add rule" always
 * available, or an add prompt when there are none. Lives on the detail page.
 */
export function AlertRuleSection({
  sensor,
}: {
  sensor: { id: string; unit: string };
}) {
  const { data, loading, error } = useQuery(SensorAlertRulesDocument, {
    variables: { sensorId: sensor.id },
    context: { suppressErrorToast: true },
  });
  const rules = data?.alertRules ?? [];
  const loadError = Boolean(error) && !data;
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <section>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">
          Alert rules{rules.length > 0 ? ` · ${rules.length}` : ''}
        </h3>
        {!loading && !loadError && rules.length > 0 ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" />
            Add rule
          </Button>
        ) : null}
      </div>

      {loading && !data ? (
        <Skeleton className="h-[120px] rounded-[12px]" />
      ) : loadError ? (
        <div className="text-[12.5px] text-muted-foreground">
          Couldn&apos;t load alert rules.
        </div>
      ) : rules.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
          {rules.map((rule) => (
            <AlertRuleCard key={rule.id} rule={rule} unit={sensor.unit} />
          ))}
        </div>
      ) : (
        <div className="rounded-[12px] border border-dashed border-border p-8 text-center">
          <div className="text-sm font-semibold">No alert rules yet</div>
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
