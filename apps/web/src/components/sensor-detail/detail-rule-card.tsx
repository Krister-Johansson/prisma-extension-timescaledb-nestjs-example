import { AppLink } from '@/components/app-link';
import { SensorStatusBadge } from '@/components/sensor/sensor-status-badge';
import type { Sensor } from '@/data/types';
import { routes } from '@/lib/routes';

export function DetailRuleCard({ sensor }: { sensor: Sensor }) {
  const rule = sensor.rule;
  return (
    <div className="flex flex-col rounded-[14px] border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold">Alert rules</div>
        <SensorStatusBadge status={sensor.status} />
      </div>

      {rule ? (
        <div className="rounded-[10px] border border-border p-3">
          <div className="mb-2.5 text-[12.5px] font-semibold">
            {rule.direction === 'ABOVE' ? 'Above threshold' : 'Below threshold'}
          </div>
          <div className="flex gap-6">
            <div>
              <div className="font-mono text-[10px] tracking-wide text-muted-2">
                THRESHOLD
              </div>
              <div className="mt-1 font-mono text-[13px] font-semibold text-alert">
                {rule.threshold} {sensor.unit}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] tracking-wide text-muted-2">
                RESET
              </div>
              <div className="mt-1 font-mono text-[13px] font-semibold text-warn">
                {rule.clearThreshold} {sensor.unit}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[10px] border border-dashed border-border p-5 text-center text-[12.5px] leading-relaxed text-muted-foreground">
          No alert rules yet.
          <br />
          Add one to start monitoring this sensor.
        </div>
      )}

      <div className="mt-3.5 flex items-center justify-between border-t border-border pt-3.5">
        <span className="text-[12.5px] text-muted-foreground">Current value</span>
        <span className="font-mono text-sm font-semibold">
          {sensor.latest} {sensor.unit}
        </span>
      </div>
      <AppLink
        to={routes.sensors.config(sensor.id)}
        className="mt-3.5 flex items-center justify-center rounded-[9px] border border-border py-2.5 text-[12.5px] font-semibold transition-colors hover:border-primary hover:text-primary"
      >
        Manage alert rules
      </AppLink>
    </div>
  );
}
