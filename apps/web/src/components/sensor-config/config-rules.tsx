import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Sensor } from '@/data/types';
import { ConfigRuleCard } from './config-rule-card';

export function ConfigRules({ sensor }: { sensor: Sensor }) {
  return (
    <section>
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Alert rules</h2>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" />
          Add rule
        </Button>
      </div>

      {sensor.rule ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3.5">
          <ConfigRuleCard
            rule={sensor.rule}
            unit={sensor.unit}
            enabled={sensor.enabled}
          />
        </div>
      ) : (
        <div className="rounded-[12px] border border-dashed border-border p-11 text-center">
          <div className="text-sm font-semibold">No alert rules yet</div>
          <div className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
            This sensor is collecting data but won&apos;t raise alerts.
            <br />
            Add a rule to start monitoring it.
          </div>
          <Button size="sm" className="mt-4 gap-1.5">
            <Plus className="size-4" />
            Add first rule
          </Button>
        </div>
      )}
    </section>
  );
}
