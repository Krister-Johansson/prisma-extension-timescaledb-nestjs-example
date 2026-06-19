import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import {
  StatGroupSeriesDocument,
  StatSensorSeriesDocument,
} from '@/graphql/widget-data.generated';
import { useDashboardTick } from './dashboard-live';
import { WINDOW_BUCKET, WINDOW_MS, type StatConfig } from './widget-config';

export interface StatPoint {
  t: number;
  value: number | null;
}
export interface StatData {
  points: StatPoint[];
  value: number | null;
  loading: boolean;
}

/** Resolve a Stat widget's windowed series (sensor or group) and reduce it to a
 * single value per the configured aggregate. Re-queries on the live tick. */
export function useStatData(cfg: StatConfig): StatData {
  const tick = useDashboardTick();
  const isSensor = cfg.scope === 'sensor';
  const bucket = WINDOW_BUCKET[cfg.window];

  // The window slides forward on each tick, which changes the variables and so
  // re-runs the query — that's the live refresh.
  const { start, end } = useMemo(() => {
    const nowMs = Date.now();
    return {
      end: new Date(nowMs).toISOString(),
      start: new Date(nowMs - WINDOW_MS[cfg.window]).toISOString(),
    };
    // Re-anchor to "now" on a tick, a window change, or a source change so a
    // reconfigured widget never queries against a stale window.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick drives refresh
  }, [cfg.window, cfg.scope, cfg.sensorId, cfg.groupId, cfg.typeKey, tick]);

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
    if (isSensor) {
      return (sensorQuery.data?.sensorReadingsBucketed ?? []).map((b) => ({
        t: new Date(b.bucket).getTime(),
        value: b.avg ?? null,
      }));
    }
    return (groupQuery.data?.groupSeries?.[0]?.points ?? []).map((p) => ({
      t: new Date(p.bucket).getTime(),
      value: p.value ?? null,
    }));
  }, [isSensor, sensorQuery.data, groupQuery.data]);

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
