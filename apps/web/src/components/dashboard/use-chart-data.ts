import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import { SERIES_COLORS } from '@/data/aggregates';
import {
  ChartGroupSeriesDocument,
  ChartSensorSeriesDocument,
} from '@/graphql/widget-data.generated';
import { useDashboardTick } from './dashboard-live';
import { useCatalog } from './use-catalog';
import {
  bucketedWindow,
  chartSeriesComplete,
  WINDOW_BUCKET,
  type ChartConfig,
  type ChartSeries,
} from './widget-config';

type Catalog = ReturnType<typeof useCatalog>;

export interface ChartSeriesMeta {
  key: string;
  label: string;
  color: string;
}
export type ChartRow = Record<string, number | null | string>;
export interface ChartData {
  rows: ChartRow[];
  series: ChartSeriesMeta[];
  unit: string;
  loading: boolean;
}

function seriesLabel(s: ChartSeries, catalog: Catalog): string {
  if (s.label) return s.label;
  if (s.scope === 'sensor')
    return catalog.sensorById.get(s.sensorId ?? '')?.name ?? 'Sensor';
  const g = catalog.groupById.get(s.groupId ?? '')?.name ?? 'Group';
  const t = catalog.typeByKey.get(s.typeKey ?? '')?.label ?? '';
  return `${g} · ${t}`.replace(/ · $/, '');
}
function seriesUnit(s: ChartSeries, catalog: Catalog): string {
  return s.scope === 'sensor'
    ? (catalog.sensorById.get(s.sensorId ?? '')?.type.unit ?? '')
    : (catalog.typeByKey.get(s.typeKey ?? '')?.unit ?? '');
}

/** Resolve every configured series (group + sensor) over the window and merge
 * them into recharts rows keyed by bucket time. Re-queries on the live tick. */
export function useChartData(cfg: ChartConfig): ChartData {
  const tick = useDashboardTick();
  const catalog = useCatalog();
  const bucket = WINDOW_BUCKET[cfg.window];

  // Keep the original index so colours/keys are stable as completeness changes.
  const indexed = cfg.series.map((s, i) => ({ s, i }));
  const groupItems = indexed.filter(
    (x) => x.s.scope === 'group' && chartSeriesComplete(x.s),
  );
  const sensorItems = indexed.filter(
    (x) => x.s.scope === 'sensor' && chartSeriesComplete(x.s),
  );

  const seriesSig = JSON.stringify(cfg.series);
  // Snap to the bucket so variables are stable within a bucket — Apollo serves
  // the cache between bucket boundaries instead of refetching on every tick.
  const { start, end } = useMemo(() => {
    return bucketedWindow(cfg.window, Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick/series drive refresh
  }, [cfg.window, tick, seriesSig]);

  const groupQuery = useQuery(ChartGroupSeriesDocument, {
    variables: {
      specs: groupItems.map((x) => ({
        groupId: x.s.groupId ?? '',
        type: x.s.typeKey ?? '',
        agg: x.s.agg,
      })),
      bucket,
      start,
      end,
    },
    skip: groupItems.length === 0,
  });
  const sensorQuery = useQuery(ChartSensorSeriesDocument, {
    variables: {
      sensorIds: sensorItems.map((x) => x.s.sensorId ?? ''),
      bucket,
      start,
      end,
    },
    skip: sensorItems.length === 0,
  });

  return useMemo<ChartData>(() => {
    const byTime = new Map<number, ChartRow>();
    const row = (t: number) => {
      let r = byTime.get(t);
      if (!r) {
        r = { t: new Date(t).toISOString() };
        byTime.set(t, r);
      }
      return r;
    };

    // Match each group result to its series by (groupId, type, agg) rather than
    // assuming the resolver preserves request order.
    const groupByKey = new Map(
      (groupQuery.data?.groupSeries ?? []).map((g) => [
        `${g.groupId}|${g.type}|${g.agg}`,
        g,
      ]),
    );
    groupItems.forEach((x) => {
      const g = groupByKey.get(`${x.s.groupId}|${x.s.typeKey}|${x.s.agg}`);
      for (const p of g?.points ?? [])
        row(new Date(p.bucket).getTime())[`s${x.i}`] = p.value ?? null;
    });
    // sensor results are flat — bucket them by sensorId.
    const bySensor = new Map<string, { bucket: string; avg: number | null }[]>();
    for (const b of sensorQuery.data?.sensorReadingsBucketedMulti ?? []) {
      const arr = bySensor.get(b.sensorId) ?? [];
      arr.push({ bucket: b.bucket as string, avg: b.avg ?? null });
      bySensor.set(b.sensorId, arr);
    }
    sensorItems.forEach((x) => {
      for (const b of bySensor.get(x.s.sensorId ?? '') ?? [])
        row(new Date(b.bucket).getTime())[`s${x.i}`] = b.avg;
    });

    const rows = [...byTime.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, r]) => r);
    const series = cfg.series
      .map((s, i) => ({ s, i }))
      .filter((x) => chartSeriesComplete(x.s))
      .map((x) => ({
        key: `s${x.i}`,
        label: seriesLabel(x.s, catalog),
        color: SERIES_COLORS[x.i % SERIES_COLORS.length],
      }));
    // Only consider rendered (complete) series so the header unit matches.
    const unit =
      cfg.series
        .filter(chartSeriesComplete)
        .map((s) => seriesUnit(s, catalog))
        .find(Boolean) ?? '';

    return {
      rows,
      series,
      unit,
      loading: groupQuery.loading || sensorQuery.loading,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    groupQuery.data,
    sensorQuery.data,
    groupQuery.loading,
    sensorQuery.loading,
    catalog,
    seriesSig,
  ]);
}
