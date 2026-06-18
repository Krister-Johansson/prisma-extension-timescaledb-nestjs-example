import { AppLink } from '@/components/app-link';
import {
  activeAlertCount,
  averagesByType,
  totalDataPoints,
} from '@/data/sensors';
import type { Sensor } from '@/data/types';
import { cn } from '@/lib/utils';
import { routes } from '@/lib/routes';

const cardClass =
  'rounded-[14px] border border-border bg-card p-[18px] shadow-sm';
const labelClass =
  'font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground';
const valueClass =
  'mt-3 font-mono text-[34px] font-semibold tracking-tight leading-none';

export function OverviewKpis({ sensors }: { sensors: Sensor[] }) {
  const alerts = activeAlertCount(sensors);
  const byType = averagesByType(sensors);

  return (
    <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className={cardClass}>
        <div className={labelClass}>TOTAL SENSORS</div>
        <div className={valueClass}>{sensors.length}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          3 types monitored
        </div>
      </div>

      <AppLink
        to={routes.alerts()}
        className={cn(cardClass, 'block transition-colors hover:border-primary')}
      >
        <div className="flex items-center justify-between">
          <span className={labelClass}>ACTIVE ALERTS</span>
          <span className="font-mono text-[10px] font-semibold text-primary">
            view →
          </span>
        </div>
        <div
          className={cn(valueClass, alerts > 0 ? 'text-alert' : 'text-foreground')}
        >
          {alerts}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {alerts > 0
            ? `${alerts} active alert${alerts > 1 ? 's' : ''}`
            : 'All systems OK'}
        </div>
      </AppLink>

      <div className={cardClass}>
        <div className={labelClass}>DATA POINTS · 24H</div>
        <div className={valueClass}>
          {totalDataPoints(sensors).toLocaleString('en-US')}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">1 reading / 5 min</div>
      </div>

      <div className={cardClass}>
        <div className={cn(labelClass, 'mb-2.5')}>AVG BY TYPE</div>
        <div className="flex flex-col gap-2">
          {byType.map((t) => (
            <div key={t.type} className="flex items-center justify-between">
              <span className="text-[12.5px] text-muted-foreground">
                {t.label}
              </span>
              <span className="font-mono text-sm font-semibold">
                {t.avg}{' '}
                <span className="text-[11px] font-normal text-muted-2">
                  {t.unit}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
