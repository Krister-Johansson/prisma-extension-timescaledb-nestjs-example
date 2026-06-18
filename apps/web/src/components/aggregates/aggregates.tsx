import { useMutation, useQuery } from '@apollo/client/react';
import { useEffect, useState } from 'react';
import { QueryError } from '@/components/common/query-error';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { buildBucketRows, buildCompare } from '@/data/aggregates';
import { toUiSensors } from '@/data/sensor-adapter';
import { averagesByType } from '@/data/sensors';
import {
  RefreshSensorReadingHourlyDocument,
  SensorReadingsHourlyDocument,
  SensorsListDocument,
} from '@/graphql/sensors.generated';
import { AggregateCompareChart } from './aggregate-compare-chart';
import { AggregateTypeCards } from './aggregate-type-cards';
import { TableBuckets } from './table-buckets';

const DAY_MS = 24 * 60 * 60 * 1000;

export function Aggregates() {
  // A stable 24h window for the hourly query (computed once).
  const [range] = useState(() => ({
    start: new Date(Date.now() - DAY_MS).toISOString(),
    end: new Date().toISOString(),
  }));

  const { data, loading, error } = useQuery(SensorsListDocument, {
    pollInterval: 10_000,
    context: { suppressErrorToast: true },
  });
  const { data: hourlyData, refetch } = useQuery(SensorReadingsHourlyDocument, {
    variables: range,
    context: { suppressErrorToast: true },
  });
  const [refresh, { loading: refreshing }] = useMutation(
    RefreshSensorReadingHourlyDocument,
  );

  const materialize = () => {
    void refresh()
      .then(() => refetch())
      .catch(() => {});
  };

  // Materialize the continuous aggregate once on mount so recent data shows.
  useEffect(() => {
    materialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[150px] rounded-[14px]" />
          ))}
        </div>
        <Skeleton className="h-[320px] rounded-[14px]" />
      </div>
    );
  }
  if (error) return <QueryError message={error.message} />;

  const sensors = toUiSensors(data);
  const sensorById = new Map(sensors.map((s) => [s.id, s]));
  const hourly = hourlyData?.sensorReadingsHourly ?? [];

  return (
    <div className="flex flex-col gap-4">
      <AggregateTypeCards types={averagesByType(sensors)} />

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-2">
          Hourly rollups from the TimescaleDB continuous aggregate.
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={materialize}
        >
          {refreshing ? 'Refreshing…' : 'Refresh aggregate'}
        </Button>
      </div>

      <AggregateCompareChart result={buildCompare(hourly, sensorById)} />
      <TableBuckets rows={buildBucketRows(hourly, sensorById)} />
    </div>
  );
}
