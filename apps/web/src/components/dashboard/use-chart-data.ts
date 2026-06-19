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

/** Label/unit for a plain (sensor or group) series — the operands a delta
 * refers to. */
function baseLabel(s: ChartSeries, catalog: Catalog): string {
  if (s.label) return s.label;
  if (s.scope === 'sensor')
    return catalog.sensorById.get(s.sensorId ?? '')?.name ?? 'Sensor';
  const g = catalog.groupById.get(s.groupId ?? '')?.name ?? 'Group';
  const t = catalog.typeByKey.get(s.typeKey ?? '')?.label ?? '';
  return `${g} · ${t}`.replace(/ · $/, '') || 'Series';
}
function baseUnit(s: ChartSeries, catalog: Catalog): string {
  return s.scope === 'sensor'
    ? (catalog.sensorById.get(s.sensorId ?? '')?.type.unit ?? '')
    : (catalog.typeByKey.get(s.typeKey ?? '')?.unit ?? '');
}

function seriesLabel(s: ChartSeries, catalog: Catalog, all: ChartSeries[]): string {
  if (s.label) return s.label;
  if (s.scope === 'delta') {
    const a = s.deltaA != null ? all[s.deltaA] : undefined;
    const b = s.deltaB != null ? all[s.deltaB] : undefined;
    return `Δ ${a ? baseLabel(a, catalog) : '?'} − ${b ? baseLabel(b, catalog) : '?'}`;
  }
  return baseLabel(s, catalog);
}
function seriesUnit(s: ChartSeries, catalog: Catalog, all: ChartSeries[]): string {
  // A delta is a difference of two like-typed series — same unit as operand A.
  if (s.scope === 'delta') {
    const a = s.deltaA != null ? all[s.deltaA] : undefined;
    return a ? baseUnit(a, catalog) : '';
  }
  return baseUnit(s, catalog);
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

    // Delta series are computed from two already-merged series (by index), on the
    // same rows: s{i} = s{deltaA} − s{deltaB} where both operands have a value.
    cfg.series.forEach((s, i) => {
      if (s.scope !== 'delta' || !chartSeriesComplete(s)) return;
      const ka = `s${s.deltaA}`;
      const kb = `s${s.deltaB}`;
      for (const r of byTime.values()) {
        const a = r[ka];
        const b = r[kb];
        r[`s${i}`] =
          typeof a === 'number' && typeof b === 'number' ? a - b : null;
      }
    });

    const rows = [...byTime.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, r]) => r);
    const series = cfg.series
      .map((s, i) => ({ s, i }))
      .filter((x) => chartSeriesComplete(x.s))
      .map((x) => ({
        key: `s${x.i}`,
        label: seriesLabel(x.s, catalog, cfg.series),
        color: SERIES_COLORS[x.i % SERIES_COLORS.length],
      }));
    // Only consider rendered (complete) series so the header unit matches.
    const unit =
      cfg.series
        .filter(chartSeriesComplete)
        .map((s) => seriesUnit(s, catalog, cfg.series))
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
