import { AppLink } from '@/components/app-link';
import { SENSORS } from '@/data/sensors';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

export function SensorPills({ activeId }: { activeId: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {SENSORS.map((sensor) => {
        const isActive = sensor.id === activeId;
        return (
          <AppLink
            key={sensor.id}
            to={routes.sensors.detail(sensor.id)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              isActive
                ? 'border-primary bg-[color-mix(in_srgb,var(--primary)_12%,var(--card))] text-primary'
                : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            {sensor.name}
          </AppLink>
        );
      })}
    </div>
  );
}
