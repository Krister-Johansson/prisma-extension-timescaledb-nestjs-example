import { SensorStatusBadge } from '@/components/sensor/sensor-status-badge';
import { typeChip } from '@/data/sensors';
import type { SensorStatus } from '@/data/types';
import type { SensorAlertRuleQuery } from '@/graphql/alert-rules.generated';
import type { SensorDetailQuery } from '@/graphql/sensors.generated';

type LiveRule = NonNullable<SensorAlertRuleQuery['alertRule']>;
type DetailSensor = SensorDetailQuery['sensor'];

/** Derive the badge status from the rule (no rule / disabled / alerting / ok). */
function ruleStatus(rule: LiveRule | null): SensorStatus {
  if (!rule) return 'NO_RULES';
  if (!rule.enabled) return 'PAUSED';
  return rule.state === 'ALERTING' ? 'ALERTING' : 'OK';
}

/** Read-only identity header for the config page (name/type edited elsewhere). */
export function ConfigHeader({
  sensor,
  rule,
}: {
  sensor: DetailSensor;
  rule: LiveRule | null;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-[14px] border border-border bg-card p-5 shadow-sm">
      <div className="flex min-w-0 items-start gap-3.5">
        <div className="flex size-[42px] flex-none items-center justify-center rounded-[10px] border border-border bg-surface-2 font-mono text-[17px] font-semibold text-muted-foreground">
          {typeChip(sensor.type)}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{sensor.name}</h2>
          <div className="mt-1 font-mono text-[11.5px] text-muted-foreground">
            {sensor.type} · {sensor.unit}
          </div>
        </div>
      </div>
      <SensorStatusBadge status={ruleStatus(rule)} />
    </div>
  );
}
