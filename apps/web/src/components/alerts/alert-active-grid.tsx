import type { Sensor } from '@/data/types';
import { AlertActiveCard } from './alert-active-card';

export function AlertActiveGrid({
  sensors,
  raisedAtById,
}: {
  sensors: Sensor[];
  raisedAtById: Map<string, string>;
}) {
  if (sensors.length === 0) {
    return (
      <div className="rounded-[14px] border border-border bg-card px-5 py-12 text-center shadow-sm">
        <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-ok-bg">
          <span className="size-4 rounded-full bg-ok" />
        </div>
        <div className="text-sm font-semibold">No active alerts</div>
        <div className="mt-1 text-[12.5px] text-muted-foreground">
          All sensors are within their threshold bands.
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
      {sensors.map((sensor) => (
        <AlertActiveCard
          key={sensor.id}
          sensor={sensor}
          raisedAt={raisedAtById.get(sensor.id)}
        />
      ))}
    </div>
  );
}
