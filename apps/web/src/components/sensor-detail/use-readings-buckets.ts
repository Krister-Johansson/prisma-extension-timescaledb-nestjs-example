import { useQuery } from '@apollo/client/react';
import { useEffect, useState } from 'react';
import { SensorReadingsBucketedDocument } from '@/graphql/sensors.generated';
import { useSearchState } from '@/lib/use-search-state';
import {
  BUCKET_INTERVAL,
  estimatePoints,
  MAX_POINTS,
  type RangeKey,
  type Resolution,
} from './chart-params';
import { resolveWindow, type TimeWindow } from './chart-window';

export interface ReadingBucket {
  bucket: string;
  avg: number | null;
  min: number | null;
  max: number | null;
  count: number;
}

export interface ReadingsBuckets {
  res: Resolution;
  range: RangeKey;
  live: boolean;
  window: TimeWindow;
  tooMany: boolean;
  pointCount: number;
  buckets: ReadingBucket[];
  loading: boolean;
  error?: Error;
  setSearch: ReturnType<typeof useSearchState<'/sensors/$sensorId/'>>[1];
}

/**
 * Single source of truth for the detail chart + data table: resolves the window
 * from the URL params, runs the bucketed query, and returns the data plus all
 * the state both views need. Calling it once (in the wrapper) keeps the chart
 * and table on the exact same window and one shared query.
 */
export function useReadingsBuckets(sensorId: string): ReadingsBuckets {
  const [{ res, range, from, to }, setSearch] =
    useSearchState('/sensors/$sensorId/');

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const { window, live } = resolveWindow({ res, range, from, to, now });
  const pointCount = estimatePoints(res, window.endMs - window.startMs);
  const tooMany = pointCount > MAX_POINTS;

  const { data, loading, error } = useQuery(SensorReadingsBucketedDocument, {
    variables: {
      sensorId,
      bucket: BUCKET_INTERVAL[res],
      start: new Date(window.startMs).toISOString(),
      end: new Date(window.endMs).toISOString(),
    },
    pollInterval: live ? 15_000 : undefined,
    skip: tooMany,
    context: { suppressErrorToast: true },
  });

  return {
    res,
    range,
    live,
    window,
    tooMany,
    pointCount,
    buckets: data?.sensorReadingsBucketed ?? [],
    loading,
    error,
    setSearch,
  };
}
