import type { Sensor } from './types';

// Fixed reference "now" so mock timestamps (and screenshots) are deterministic.
const NOW = Date.parse('2026-06-17T22:00:00Z');
const STEP_MS = 30 * 60 * 1000; // series points are 30 min apart

export interface Reading {
  ts: number;
  time: string;
  value: number;
}

export interface HourlyBucket {
  ts: number;
  hour: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

export type AlertKind = 'RAISED' | 'CLEARED';
export interface AlertEvent {
  id: string;
  kind: AlertKind;
  ts: number;
  time: string;
  value: number;
}

function hhmm(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Raw readings (oldest → newest) reconstructed from the sensor's series. */
export function readings(sensor: Sensor): Reading[] {
  const n = sensor.series.length;
  const start = NOW - (n - 1) * STEP_MS;
  return sensor.series.map((value, i) => {
    const ts = start + i * STEP_MS;
    return { ts, time: hhmm(ts), value };
  });
}

/** Group readings into hourly buckets (avg / min / max / count). */
export function hourly(sensor: Sensor): HourlyBucket[] {
  const buckets = new Map<number, number[]>();
  for (const r of readings(sensor)) {
    const hourTs = Math.floor(r.ts / 3_600_000) * 3_600_000;
    const arr = buckets.get(hourTs) ?? [];
    arr.push(r.value);
    buckets.set(hourTs, arr);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([ts, values]) => ({
      ts,
      hour: hhmm(ts),
      avg: round(values.reduce((a, b) => a + b, 0) / values.length),
      min: round(Math.min(...values)),
      max: round(Math.max(...values)),
      count: values.length,
    }));
}

/** Most-recent readings (newest first) with the delta vs the previous point. */
export function recentReadings(sensor: Sensor, take = 12) {
  const all = readings(sensor);
  return all
    .slice(-take)
    .reverse()
    .map((r, i, arr) => {
      const prev = arr[i + 1];
      const delta = prev ? round(r.value - prev.value) : 0;
      return { ...r, delta };
    });
}

/**
 * Synthetic alert history: ALERTING/WARNING sensors show a RAISED (+ CLEARED)
 * event; calm sensors return an empty history (drives the empty state).
 */
export function alertHistory(sensor: Sensor): AlertEvent[] {
  if (
    sensor.status !== 'ALERTING' &&
    sensor.status !== 'WARNING'
  ) {
    return [];
  }
  const rs = readings(sensor);
  if (rs.length === 0) return [];
  const raised = rs[Math.floor(rs.length * 0.55)];
  const events: AlertEvent[] = [
    { id: 'a1', kind: 'RAISED', ts: raised.ts, time: raised.time, value: raised.value },
  ];
  if (sensor.status === 'WARNING') {
    const cleared = rs[Math.floor(rs.length * 0.75)];
    events.push({
      id: 'a2',
      kind: 'CLEARED',
      ts: cleared.ts,
      time: cleared.time,
      value: cleared.value,
    });
  }
  return events.reverse();
}
