import { useQuery } from '@apollo/client/react';
import { Link } from '@tanstack/react-router';
import { Bell } from 'lucide-react';
import { SensorStatusBadge } from '@/components/sensor/sensor-status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { SensorStatus } from '@/data/types';
import {
  type SensorAlertRuleQuery,
  SensorAlertRuleDocument,
} from '@/graphql/alert-rules.generated';
import { routes } from '@/lib/routes';

type LiveRule = NonNullable<SensorAlertRuleQuery['alertRule']>;

function ruleStatus(rule: LiveRule | null): SensorStatus {
  if (!rule) return 'NO_RULES';
  if (!rule.enabled) return 'PAUSED';
  return rule.state === 'ALERTING' ? 'ALERTING' : 'OK';
}

/**
 * Surfaces the sensor's single alert rule on the detail page (read-only) with a
 * link to the config page to add/edit it. A sensor has at most one rule.
 */
export function DetailAlertRule({
  sensorId,
  unit,
}: {
  sensorId: string;
  unit: string;
}) {
  const { data, loading } = useQuery(SensorAlertRuleDocument, {
    variables: { sensorId },
    context: { suppressErrorToast: true },
  });
  const rule = data?.alertRule ?? null;

  return (
    <div className="rounded-[14px] border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Alert rule</h3>
        {!loading && rule ? <SensorStatusBadge status={ruleStatus(rule)} /> : null}
      </div>

      {loading ? (
        <Skeleton className="h-9 w-full rounded-md" />
      ) : rule ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-mono text-[12.5px] text-muted-foreground">
            {rule.direction === 'ABOVE' ? 'Above' : 'Below'} {rule.threshold}{' '}
            {unit} · reset at {rule.clearThreshold} {unit}
            {rule.enabled ? '' : ' · disabled'}
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to={routes.sensors.config(sensorId) as never}>Configure</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
            <Bell className="size-4" />
            No alert rule — this sensor won&apos;t raise alerts.
          </div>
          <Button asChild size="sm" className="shrink-0 gap-1.5">
            <Link to={routes.sensors.config(sensorId) as never}>
              Add alert rule
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
