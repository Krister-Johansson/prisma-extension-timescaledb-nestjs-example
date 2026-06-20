import { useQuery } from '@apollo/client/react';
import { useEffect, useState } from 'react';
import type { AnomalySeverity } from '@/gql/schema-types';
import {
  SensorAnomaliesDocument,
  SensorReadingsBucketedDocument,
} from '@/graphql/sensors.generated';
import { useSearchState } from '@/lib/use-search-state';
import {
  BUCKET_INTERVAL,
  estimatePoints,
  MAX_POINTS,
  type RangeKey,
  type Resolution,
} from './chart-params';
import { resolveWindow, type TimeWindow } from './chart-window';

/** An anomaly attached to the bucket whose window contains it. */
export interface AnomalyMark {
  id: string;
  time: string;
  value: number;
  score: number;
  severity: AnomalySeverity;
}

export interface ReadingBucket {
  bucket: string;
  avg: number | null;
  min: number | null;
  max: number | null;
  count: number;
  /** Set when an anomaly falls inside this bucket (most severe one wins). */
  anomaly?: AnomalyMark;
}

/** Attach each in-window anomaly to the bucket that contains it (the greatest
 * bucket start ≤ the anomaly time); the highest-scoring anomaly per bucket wins. */
function attachAnomalies(
  buckets: ReadingBucket[],
  anomalies: AnomalyMark[],
): ReadingBucket[] {
  if (anomalies.length === 0 || buckets.length === 0) return buckets;
  const starts = buckets.map((b) => Date.parse(b.bucket));
  const byIndex = new Map<number, AnomalyMark>();
  for (const a of anomalies) {
    const t = Date.parse(a.time);
    let lo = 0;
    let hi = starts.length - 1;
    let idx = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (starts[mid] <= t) {
        idx = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (idx < 0) continue;
    const existing = byIndex.get(idx);
    if (!existing || a.score > existing.score) byIndex.set(idx, a);
  }
  if (byIndex.size === 0) return buckets;
  return buckets.map((b, i) => {
    const a = byIndex.get(i);
    return a ? { ...b, anomaly: a } : b;
  });
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

  // Server-side window filter so every in-window anomaly is returned (a fixed
  // take could silently drop some before filtering).
  const { data: anomalyData } = useQuery(SensorAnomaliesDocument, {
    variables: {
      sensorId,
      start: new Date(window.startMs).toISOString(),
      end: new Date(window.endMs).toISOString(),
    },
    pollInterval: live ? 15_000 : undefined,
    skip: tooMany,
    context: { suppressErrorToast: true },
  });

  const buckets = attachAnomalies(
    data?.sensorReadingsBucketed ?? [],
    anomalyData?.anomalies ?? [],
  );

  return {
    res,
    range,
    live,
    window,
    tooMany,
    pointCount,
    buckets,
    loading,
    error,
    setSearch,
  };
}
