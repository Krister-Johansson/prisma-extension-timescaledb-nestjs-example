import { SensorStatusBadge } from '@/components/sensor/sensor-status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { typeChip } from '@/data/sensors';
import type { Sensor } from '@/data/types';

export function ConfigHeader({ sensor }: { sensor: Sensor }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-[14px] border border-border bg-card p-5 shadow-sm">
      <div className="flex min-w-0 items-start gap-3.5">
        <div className="flex size-[42px] flex-none items-center justify-center rounded-[10px] border border-border bg-surface-2 font-mono text-[17px] font-semibold text-muted-foreground">
          {typeChip(sensor.type)}
        </div>
        <div className="min-w-0">
          <label
            htmlFor="sensor-name"
            className="mb-1.5 block font-mono text-[10.5px] font-semibold tracking-[0.06em] text-muted-foreground"
          >
            SENSOR NAME
          </label>
          <Input
            id="sensor-name"
            defaultValue={sensor.name}
            className="w-[300px] max-w-full font-semibold"
          />
          <div className="mt-2 font-mono text-[11.5px] text-muted-foreground">
            {sensor.type} · current {sensor.latest} {sensor.unit} · type can&apos;t
            be changed
          </div>
        </div>
      </div>
      <div className="flex flex-none items-center gap-2.5">
        <SensorStatusBadge status={sensor.status} />
        <Button variant="outline" size="sm">
          {sensor.enabled ? 'Disable' : 'Enable'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-[color-mix(in_srgb,var(--alert)_35%,var(--border))] text-alert hover:text-alert"
        >
          Delete sensor
        </Button>
      </div>
    </div>
  );
}
