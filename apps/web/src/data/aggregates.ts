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

const round = (n: number) => Math.round(n * 10) / 10;

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
