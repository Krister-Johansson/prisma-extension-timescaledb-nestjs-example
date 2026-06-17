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
    return {
      sensor,
      buckets,
      color: SERIES_COLORS[i % SERIES_COLORS.length],
      norm: avgs.map((v) => Math.round(((v - min) / span) * 100) / 100),
    };
  });

  const hours = perSensor[0]?.buckets.map((b) => b.hour) ?? [];
  const data = hours.map((hour, hi) => {
    const row: Record<string, number | string> = { hour };
    for (const ps of perSensor) row[ps.sensor.id] = ps.norm[hi];
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
