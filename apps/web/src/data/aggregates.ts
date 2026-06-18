import type { SensorReadingsHourlyQuery } from '@/graphql/sensors.generated';
import type { Sensor } from './types';

type HourlyRow = SensorReadingsHourlyQuery['sensorReadingsHourly'][number];

// Distinct, saturated line colors (readable on light + dark) for the
// cross-sensor comparison chart — one per sensor by index.
export const SERIES_COLORS = [
  '#ff6700',
  '#0ea5e9',
  '#8b5cf6',
  '#10b981',
  '#f43f5e',
  '#f59e0b',
];

export interface CompareSeries {
  id: string;
  name: string;
  color: string;
}

export interface CompareResult {
  data: Array<Record<string, number | string>>;
  series: CompareSeries[];
}

const round = (n: number) => Math.round(n * 10) / 10;

const hourLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Hourly averages per sensor, each normalized to its own min–max range so series
 * on different scales (°C vs hPa vs %) are comparable on one axis. Rows align by
 * bucket timestamp.
 */
export function buildCompare(
  rows: HourlyRow[],
  sensorById: Map<string, Sensor>,
): CompareResult {
  const bySensor = new Map<string, HourlyRow[]>();
  for (const r of rows) {
    const list = bySensor.get(r.sensorId);
    if (list) list.push(r);
    else bySensor.set(r.sensorId, [r]);
  }

  const perSensor = [...bySensor.entries()].map(([id, buckets], i) => {
    const avgs = buckets.map((b) => b.avgValue);
    const min = Math.min(...avgs);
    const max = Math.max(...avgs);
    const span = max - min || 1;
    const normByBucket = new Map(
      buckets.map((b) => [
        b.bucket,
        Math.round(((b.avgValue - min) / span) * 100) / 100,
      ]),
    );
    return { id, color: SERIES_COLORS[i % SERIES_COLORS.length], normByBucket };
  });

  const allBuckets = [...new Set(rows.map((r) => r.bucket))].sort();
  const data = allBuckets.map((bucket) => {
    const row: Record<string, number | string> = { hour: hourLabel(bucket) };
    for (const ps of perSensor) {
      const v = ps.normByBucket.get(bucket);
      if (v !== undefined) row[ps.id] = v;
    }
    return row;
  });

  const series = perSensor.map((ps) => ({
    id: ps.id,
    name: sensorById.get(ps.id)?.name ?? 'Sensor',
    color: ps.color,
  }));

  return { data, series };
}

export interface BucketRow {
  id: string;
  sensor: string;
  unit: string;
  hour: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

/** Flatten hourly rows into table rows (newest bucket first). */
export function buildBucketRows(
  rows: HourlyRow[],
  sensorById: Map<string, Sensor>,
): BucketRow[] {
  return [...rows]
    .sort((a, b) => b.bucket.localeCompare(a.bucket))
    .map((r) => ({
      id: `${r.sensorId}-${r.bucket}`,
      sensor: sensorById.get(r.sensorId)?.name ?? 'Unknown sensor',
      unit: sensorById.get(r.sensorId)?.unit ?? '',
      hour: new Date(r.bucket).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
      }),
      avg: round(r.avgValue),
      min: round(r.minValue),
      max: round(r.maxValue),
      count: r.samples,
    }));
}
