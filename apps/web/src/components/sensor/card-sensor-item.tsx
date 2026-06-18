import { AppLink } from '@/components/app-link';
import { ruleSummary, typeChip } from '@/data/sensors';
import type { Sensor } from '@/data/types';
import { routes } from '@/lib/routes';
import { SensorSparkline } from './sensor-sparkline';
import { SensorStatusBadge } from './sensor-status-badge';

export function CardSensorItem({ sensor }: { sensor: Sensor }) {
  return (
    <AppLink
      to={routes.sensors.detail(sensor.id)}
      className="flex flex-col gap-3.5 rounded-[14px] border border-border bg-card p-[17px] shadow-sm transition-[border-color,transform] hover:-translate-y-0.5 hover:border-primary"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 flex-none items-center justify-center rounded-[9px] border border-border bg-surface-2 font-mono text-sm font-semibold text-muted-foreground">
            {typeChip(sensor.type)}
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold">{sensor.name}</div>
            <div className="mt-0.5 font-mono text-[10.5px] tracking-wide text-muted-foreground">
              {sensor.typeLabel}
            </div>
          </div>
        </div>
        <SensorStatusBadge status={sensor.status} />
      </div>

      <div className="flex items-end gap-1.5">
        <span className="font-mono text-3xl font-semibold leading-none tracking-tight">
          {sensor.latest}
        </span>
        <span className="mb-1 text-[13px] text-muted-foreground">
          {sensor.unit}
        </span>
      </div>

      <SensorSparkline series={sensor.series} status={sensor.status} />

      <div className="flex items-center justify-between border-t border-border pt-3 font-mono text-[11px] text-muted-2">
        <span>{ruleSummary(sensor)}</span>
        <span>24h</span>
      </div>
    </AppLink>
  );
}
