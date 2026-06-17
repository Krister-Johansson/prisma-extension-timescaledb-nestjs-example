import { AppLink } from '@/components/app-link';
import { SensorSparkline } from '@/components/sensor/sensor-sparkline';
import { raisedAgo } from '@/data/alerts';
import { ruleSummary, typeChip } from '@/data/sensors';
import type { Sensor } from '@/data/types';
import { routes } from '@/lib/routes';

export function AlertActiveCard({ sensor }: { sensor: Sensor }) {
  return (
    <AppLink
      to={routes.sensors.detail(sensor.id)}
      className="flex flex-col gap-3 rounded-[14px] border border-[color-mix(in_srgb,var(--alert)_50%,var(--border))] bg-card p-[17px] shadow-sm transition-[border-color,transform] hover:-translate-y-0.5 hover:border-alert"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 flex-none items-center justify-center rounded-[9px] border border-[color-mix(in_srgb,var(--alert)_30%,transparent)] bg-alert-bg font-mono text-sm font-semibold text-alert">
            {typeChip(sensor.type)}
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold">{sensor.name}</div>
            <div className="mt-0.5 font-mono text-[10.5px] tracking-wide text-muted-foreground">
              {sensor.type}
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-alert-bg px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wide text-alert">
          <span className="size-[7px] animate-pulse rounded-full bg-alert" />
          ALERTING
        </span>
      </div>

      <div className="flex items-end gap-2">
        <span className="font-mono text-3xl font-semibold leading-none tracking-tight text-alert">
          {sensor.latest}
        </span>
        <span className="mb-1 text-[13px] text-muted-foreground">
          {sensor.unit}
        </span>
        <span className="mb-1 ml-auto font-mono text-[11px] text-muted-2">
          {ruleSummary(sensor)}
        </span>
      </div>

      <SensorSparkline series={sensor.series} status={sensor.status} />

      <div className="flex items-center justify-between border-t border-border pt-3 font-mono text-[11px] text-muted-2">
        <span>{raisedAgo(sensor)}</span>
        <span className="text-primary">View sensor →</span>
      </div>
    </AppLink>
  );
}
