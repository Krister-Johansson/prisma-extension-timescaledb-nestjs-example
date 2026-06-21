import { useMutation, useQuery } from '@apollo/client/react';
import { CheckCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { QueryError } from '@/components/common/query-error';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toUiSensors } from '@/data/sensor-adapter';
import {
  AcknowledgeAllAnomaliesDocument,
  AcknowledgeAnomalyDocument,
  AllAnomaliesDocument,
  type AllAnomaliesQuery,
  AnomalyDetectedDocument,
} from '@/graphql/anomalies.generated';
import { SensorsListDocument } from '@/graphql/sensors.generated';
import { cn } from '@/lib/utils';
import { type AnomalyRow, TableAnomalyLog } from './table-anomaly-log';

const MAX_ANOMALIES = 100;
type View = 'open' | 'dismissed';

export function Anomalies() {
  const [view, setView] = useState<View>('open');

  const { data: sensorsData } = useQuery(SensorsListDocument, {
    pollInterval: 10_000,
    context: { suppressErrorToast: true },
  });
  const { data, loading, error, subscribeToMore } = useQuery(
    AllAnomaliesDocument,
    {
      variables: { take: MAX_ANOMALIES },
      // Refetch on mount so navigating in always shows the latest, not stale
      // cache; the subscription then keeps it live.
      fetchPolicy: 'cache-and-network',
      pollInterval: 30_000,
      context: { suppressErrorToast: true },
    },
  );

  const [acknowledge] = useMutation(AcknowledgeAnomalyDocument);
  const [acknowledgeAll, { loading: clearing }] = useMutation(
    AcknowledgeAllAnomaliesDocument,
    {
      refetchQueries: [
        { query: AllAnomaliesDocument, variables: { take: MAX_ANOMALIES } },
      ],
    },
  );

  // Live updates: a new anomaly is prepended; a re-published one (e.g. once its
  // AI summary lands) replaces the existing entry in place.
  useEffect(
    () =>
      subscribeToMore({
        document: AnomalyDetectedDocument,
        updateQuery: (prev, { subscriptionData }) => {
          const current = prev as AllAnomaliesQuery;
          const a = subscriptionData.data?.anomalyDetected;
          if (!a) return current;
          const exists = current.anomalies.some((x) => x.id === a.id);
          return {
            anomalies: exists
              ? current.anomalies.map((x) => (x.id === a.id ? a : x))
              : [a, ...current.anomalies].slice(0, MAX_ANOMALIES),
          };
        },
      }),
    [subscribeToMore],
  );

  const onAcknowledge = (id: string, acknowledged: boolean) => {
    acknowledge({
      variables: { id, acknowledged },
      optimisticResponse: {
        acknowledgeAnomaly: {
          __typename: 'Anomaly',
          id,
          acknowledgedAt: acknowledged ? new Date().toISOString() : null,
        },
      },
    }).catch(() => {});
  };

  if (loading && !data) {
    return <Skeleton className="h-[420px] rounded-[14px]" />;
  }
  if (error) return <QueryError message={error.message} />;

  const sensorById = new Map(toUiSensors(sensorsData).map((s) => [s.id, s]));
  const allRows: AnomalyRow[] = (data?.anomalies ?? []).map((a) => ({
    id: a.id,
    sensorId: a.sensorId,
    sensor: sensorById.get(a.sensorId)?.name ?? 'Unknown sensor',
    unit: sensorById.get(a.sensorId)?.unit ?? '',
    severity: a.severity,
    time: a.time,
    value: a.value,
    median: a.median,
    score: a.score,
    aiSummary: a.aiSummary,
    acknowledgedAt: a.acknowledgedAt,
  }));
  const open = allRows.filter((r) => !r.acknowledgedAt);
  const dismissed = allRows.filter((r) => r.acknowledgedAt);
  const rows = view === 'open' ? open : dismissed;
  const critical = open.filter((r) => r.severity === 'CRITICAL').length;

  return (
    <div className="flex flex-col gap-7">
      <section>
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">
            Detected anomalies
            {critical > 0 && (
              <span className="ml-1.5 font-normal text-alert">
                {critical} critical
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-border p-0.5 text-[12px]">
              <button
                type="button"
                onClick={() => setView('open')}
                className={cn(
                  'rounded px-2.5 py-1 font-medium',
                  view === 'open'
                    ? 'bg-surface-2 text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Open ({open.length})
              </button>
              <button
                type="button"
                onClick={() => setView('dismissed')}
                className={cn(
                  'rounded px-2.5 py-1 font-medium',
                  view === 'dismissed'
                    ? 'bg-surface-2 text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Dismissed ({dismissed.length})
              </button>
            </div>
            {view === 'open' && open.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={clearing}
                onClick={() => {
                  acknowledgeAll().catch(() => {});
                }}
              >
                <CheckCheck className="size-3.5" />
                Clear all
              </Button>
            )}
          </div>
        </div>
        <TableAnomalyLog
          rows={rows}
          onAcknowledge={onAcknowledge}
          emptyMessage={
            view === 'dismissed'
              ? 'No dismissed anomalies.'
              : 'No open anomalies — log an out-of-range value on a sensor to try the detector.'
          }
        />
      </section>
    </div>
  );
}
