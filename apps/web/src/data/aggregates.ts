import { hourly } from './detail';
import { SENSORS } from './sensors';

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

/**
 * Hourly averages per sensor, each normalized to its own min–max range so series
 * on different scales (°C vs hPa vs %) are visually comparable on one axis.
 */
export function compareSeries(): CompareResult {
  const perSensor = SENSORS.map((sensor, i) => {
    const buckets = hourly(sensor);
    const avgs = buckets.map((b) => b.avg);
    const min = Math.min(...avgs);
    const max = Math.max(...avgs);
    const span = max - min || 1;
    // Key the normalized value by the bucket's hour timestamp, so rows align by
    // hour rather than by array index (robust to differing bucket counts).
    const normByTs = new Map(
      buckets.map((b) => [b.ts, Math.round(((b.avg - min) / span) * 100) / 100]),
    );
    return { sensor, color: SERIES_COLORS[i % SERIES_COLORS.length], normByTs };
  });

  const labelByTs = new Map<number, string>();
  for (const sensor of SENSORS) {
    for (const b of hourly(sensor)) labelByTs.set(b.ts, b.hour);
  }
  const allTs = [...labelByTs.keys()].sort((a, b) => a - b);

  const data = allTs.map((ts) => {
    const row: Record<string, number | string> = { hour: labelByTs.get(ts)! };
    for (const ps of perSensor) {
      const value = ps.normByTs.get(ts);
      if (value !== undefined) row[ps.sensor.id] = value;
    }
    return row;
  });
  const series = perSensor.map((ps) => ({
    id: ps.sensor.id,
    name: ps.sensor.name,
    color: ps.color,
  }));
  return { data, series };
}

export interface BucketRow {
  id: string;
  sensor: string;
  hour: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

/** Most-recent `take` hourly buckets for every sensor (newest first). */
export function recentBuckets(take = 6): BucketRow[] {
  const rows: BucketRow[] = [];
  for (const sensor of SENSORS) {
    for (const b of hourly(sensor).slice(-take).reverse()) {
      rows.push({
        id: `${sensor.id}-${b.ts}`,
        sensor: sensor.name,
        hour: b.hour,
        avg: b.avg,
        min: b.min,
        max: b.max,
        count: b.count,
      });
    }
  }
  return rows;
}
