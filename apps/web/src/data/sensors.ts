import type { Sensor, SensorType } from './types';

export const UNIT: Record<SensorType, string> = {
  TEMPERATURE: '°C',
  PRESSURE: 'hPa',
  HUMIDITY: '%',
};

// Real ingestion rate (1 reading / 5 min) drives the KPI count. The `series`
// below is a separate, coarser 30-min downsample used only for the sparklines —
// 288 points per card would be needless detail at sparkline size.
const READINGS_PER_DAY = 288;
const SPARK_POINTS = 48; // 24h at 30-min spacing (display only)

/** Deterministic 24h sparkline series (no RNG, so mock + screenshots are stable). */
function series(base: number, amp: number, freq: number, drift = 0): number[] {
  return Array.from({ length: SPARK_POINTS }, (_, i) => {
    const v = base + Math.sin((i / SPARK_POINTS) * Math.PI * freq) * amp + (i / SPARK_POINTS) * drift;
    return Math.round(v * 10) / 10;
  });
}

/** Static demo sensors shaped like the eventual GraphQL `Sensor` type. */
export const SENSORS: Sensor[] = [
  {
    id: 'boiler-temp',
    name: 'Boiler temperature',
    type: 'TEMPERATURE',
    unit: '°C',
    latest: 36.4,
    status: 'ALERTING',
    enabled: true,
    rule: { direction: 'ABOVE', threshold: 35, clearThreshold: 33 },
    series: series(31, 5.5, 3, 2.5),
  },
  {
    id: 'ambient-temp',
    name: 'Ambient temperature',
    type: 'TEMPERATURE',
    unit: '°C',
    latest: 21.7,
    status: 'OK',
    enabled: true,
    rule: { direction: 'ABOVE', threshold: 28, clearThreshold: 26 },
    series: series(21, 1.8, 4),
  },
  {
    id: 'line-pressure',
    name: 'Line pressure',
    type: 'PRESSURE',
    unit: 'hPa',
    latest: 1004,
    status: 'OK',
    enabled: true,
    rule: { direction: 'BELOW', threshold: 980, clearThreshold: 1000 },
    series: series(1006, 9, 5),
  },
  {
    id: 'pump-pressure',
    name: 'Pump pressure',
    type: 'PRESSURE',
    unit: 'hPa',
    latest: 977,
    status: 'WARNING',
    enabled: true,
    rule: { direction: 'BELOW', threshold: 970, clearThreshold: 990 },
    series: series(986, 12, 6, -8),
  },
  {
    id: 'room-humidity',
    name: 'Room humidity',
    type: 'HUMIDITY',
    unit: '%',
    latest: 63,
    status: 'OK',
    enabled: true,
    rule: { direction: 'ABOVE', threshold: 80, clearThreshold: 75 },
    series: series(61, 6, 4),
  },
  {
    id: 'cellar-humidity',
    name: 'Cellar humidity',
    type: 'HUMIDITY',
    unit: '%',
    latest: 58,
    status: 'NO_RULES',
    enabled: true,
    series: series(57, 4, 3),
  },
];

export function sensorById(id: string): Sensor | undefined {
  return SENSORS.find((s) => s.id === id);
}

/** Short human label for a sensor's alert rule (or a no-rule note). */
export function ruleSummary(sensor: Sensor): string {
  if (!sensor.rule) return 'No alert rule';
  const op = sensor.rule.direction === 'ABOVE' ? '≥' : '≤';
  return `${op} ${sensor.rule.threshold} ${sensor.unit}`;
}

export function typeChip(type: SensorType): string {
  return type.charAt(0);
}

export function activeAlertCount(sensors: Sensor[] = SENSORS): number {
  return sensors.filter((s) => s.status === 'ALERTING').length;
}

export interface TypeAverage {
  type: SensorType;
  unit: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

export function averagesByType(sensors: Sensor[] = SENSORS): TypeAverage[] {
  const types: SensorType[] = ['TEMPERATURE', 'PRESSURE', 'HUMIDITY'];
  return types.map((type) => {
    const group = sensors.filter((s) => s.type === type);
    const values = group.map((s) => s.latest);
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      type,
      unit: UNIT[type],
      avg: values.length ? Math.round((sum / values.length) * 10) / 10 : 0,
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0,
      count: group.length,
    };
  });
}

/** ~288 readings/day per sensor (1 / 5 min), as in the design KPI. */
export function totalDataPoints(sensors: Sensor[] = SENSORS): number {
  return sensors.length * READINGS_PER_DAY;
}
