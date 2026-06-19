import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import {
  StatGroupSeriesDocument,
  StatSensorSeriesDocument,
} from '@/graphql/widget-data.generated';
import { useDashboardTick, useLiveReading } from './dashboard-live';
import { bucketedWindow, WINDOW_BUCKET, type StatConfig } from './widget-config';

export interface StatPoint {
  t: number;
  value: number | null;
}
export interface StatData {
  points: StatPoint[];
  value: number | null;
  loading: boolean;
}

/** Just the fields needed to resolve a windowed value — shared by Stat + Gauge. */
export type StatSource = Pick<
  StatConfig,
  'scope' | 'sensorId' | 'groupId' | 'typeKey' | 'agg' | 'window'
>;

/** Resolve a windowed series (sensor or group) and reduce it to a single value
 * per the configured aggregate. The query window is snapped to the bucket so it
 * only refetches when the bucket advances; a sensor's "current" value is kept
 * live by the pushed subscription reading in between. */
export function useStatData(cfg: StatSource): StatData {
  const tick = useDashboardTick();
  const isSensor = cfg.scope === 'sensor';
  const bucket = WINDOW_BUCKET[cfg.window];

  // Snap to the bucket: re-evaluated on each tick, but the value only changes
  // when the bucket advances, so within a bucket Apollo serves the cache (no
  // refetch). tick is the recompute trigger.
  const { start, end } = useMemo(() => {
    return bucketedWindow(cfg.window, Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick drives refresh
  }, [cfg.window, tick]);

  // For a sensor "current" widget, push the latest reading in live so the value
  // updates between bucket refetches.
  const live = useLiveReading(isSensor ? cfg.sensorId : undefined);

  const sensorQuery = useQuery(StatSensorSeriesDocument, {
    variables: { sensorId: cfg.sensorId ?? '', bucket, start, end },
    skip: !isSensor || !cfg.sensorId,
  });
  const groupQuery = useQuery(StatGroupSeriesDocument, {
    variables: {
      groupId: cfg.groupId ?? '',
      type: cfg.typeKey ?? '',
      bucket,
      start,
      end,
    },
    skip: isSensor || !cfg.groupId || !cfg.typeKey,
  });

  const points = useMemo<StatPoint[]>(() => {
    if (!isSensor) {
      return (groupQuery.data?.groupSeries?.[0]?.points ?? []).map((p) => ({
        t: new Date(p.bucket).getTime(),
        value: p.value ?? null,
      }));
    }
    const pts: StatPoint[] = (
      sensorQuery.data?.sensorReadingsBucketed ?? []
    ).map((b) => ({ t: new Date(b.bucket).getTime(), value: b.avg ?? null }));
    // Append the live reading for a "current" widget so it tracks the latest
    // value without waiting for the next bucket refetch.
    if (
      cfg.agg === 'last' &&
      live &&
      (pts.length === 0 || live.time > pts[pts.length - 1].t)
    ) {
      pts.push({ t: live.time, value: live.value });
    }
    return pts;
  }, [isSensor, sensorQuery.data, groupQuery.data, cfg.agg, live]);

  const value = useMemo(() => {
    const nums = points
      .map((p) => p.value)
      .filter((v): v is number => v != null);
    if (nums.length === 0) return null;
    switch (cfg.agg) {
      case 'last':
        return points.filter((p) => p.value != null).at(-1)?.value ?? null;
      case 'avg':
        return nums.reduce((a, b) => a + b, 0) / nums.length;
      case 'min':
        return Math.min(...nums);
      case 'max':
        return Math.max(...nums);
    }
  }, [points, cfg.agg]);

  return {
    points,
    value,
    loading: isSensor ? sensorQuery.loading : groupQuery.loading,
  };
}
