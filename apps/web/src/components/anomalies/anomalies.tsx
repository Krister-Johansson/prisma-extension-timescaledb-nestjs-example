import { useQuery } from '@apollo/client/react';
import { useEffect } from 'react';
import { QueryError } from '@/components/common/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { toUiSensors } from '@/data/sensor-adapter';
import {
  AllAnomaliesDocument,
  type AllAnomaliesQuery,
  AnomalyDetectedDocument,
} from '@/graphql/anomalies.generated';
import { SensorsListDocument } from '@/graphql/sensors.generated';
import { type AnomalyRow, TableAnomalyLog } from './table-anomaly-log';

const MAX_ANOMALIES = 100;

export function Anomalies() {
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

  if (loading && !data) {
    return <Skeleton className="h-[420px] rounded-[14px]" />;
  }
  if (error) return <QueryError message={error.message} />;

  const sensorById = new Map(toUiSensors(sensorsData).map((s) => [s.id, s]));
  const rows: AnomalyRow[] = (data?.anomalies ?? []).map((a) => ({
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
  }));
  const critical = rows.filter((r) => r.severity === 'CRITICAL').length;

  return (
    <div className="flex flex-col gap-7">
      <section>
        <h2 className="mb-3.5 text-sm font-semibold">
          Detected anomalies · recent
          {rows.length > 0 ? ` · ${rows.length}` : ''}
          {critical > 0 && (
            <span className="ml-1.5 font-normal text-alert">
              {critical} critical
            </span>
          )}
        </h2>
        <TableAnomalyLog rows={rows} />
      </section>
    </div>
  );
}
