import type { Sensor, SensorType } from './types';

// Real ingestion rate (1 reading / 5 min) drives the KPI count.
const READINGS_PER_DAY = 288;

/** Short human label for a sensor's alert rule (or a no-rule note). */
export function ruleSummary(sensor: Sensor): string {
  if (!sensor.rule) return 'No alert rule';
  const op = sensor.rule.direction === 'ABOVE' ? '≥' : '≤';
  return `${op} ${sensor.rule.threshold} ${sensor.unit}`;
}

/** One-letter chip for a type key (e.g. T, P, H, C). */
export function typeChip(type: SensorType): string {
  return type.charAt(0);
}

export function activeAlertCount(sensors: Sensor[]): number {
  return sensors.filter((s) => s.status === 'ALERTING').length;
}

export interface TypeAverage {
  /** Type key. */
  type: SensorType;
  /** Human label for the type. */
  label: string;
  unit: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

/** Average latest value per measurement type — types are derived from the
 * sensors present (dynamic), so new types appear automatically. */
export function averagesByType(sensors: Sensor[]): TypeAverage[] {
  const byType = new Map<string, Sensor[]>();
  for (const s of sensors) {
    const list = byType.get(s.type);
    if (list) list.push(s);
    else byType.set(s.type, [s]);
  }
  return [...byType.values()]
    .map((group) => {
      const values = group.map((s) => s.latest);
      const sum = values.reduce((a, b) => a + b, 0);
      return {
        type: group[0].type,
        label: group[0].typeLabel,
        unit: group[0].unit,
        avg: values.length ? Math.round((sum / values.length) * 10) / 10 : 0,
        min: values.length ? Math.min(...values) : 0,
        max: values.length ? Math.max(...values) : 0,
        count: group.length,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** ~288 readings/day per sensor (1 / 5 min), as in the design KPI. */
export function totalDataPoints(sensors: Sensor[]): number {
  return sensors.length * READINGS_PER_DAY;
}
