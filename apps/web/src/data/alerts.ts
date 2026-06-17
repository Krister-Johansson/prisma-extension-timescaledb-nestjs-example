import { agoLabel, alertHistory, type AlertKind } from './detail';
import { SENSORS } from './sensors';
import type { Sensor } from './types';

/** Sensors currently in the ALERTING state (active alerts). */
export function activeAlerts(): Sensor[] {
  return SENSORS.filter((s) => s.status === 'ALERTING');
}

export interface EventLogRow {
  id: string;
  sensor: string;
  unit: string;
  kind: AlertKind;
  time: string;
  ts: number;
  value: number;
}

/** All alert events across every sensor, newest first. */
export function eventLog(): EventLogRow[] {
  return SENSORS.flatMap((sensor) =>
    alertHistory(sensor).map((event) => ({
      id: `${sensor.id}-${event.id}`,
      sensor: sensor.name,
      unit: sensor.unit,
      kind: event.kind,
      time: event.time,
      ts: event.ts,
      value: event.value,
    })),
  ).sort((a, b) => b.ts - a.ts);
}

/** "raised Xh ago" label for an active alert, from its RAISED event. */
export function raisedAgo(sensor: Sensor): string {
  const raised = alertHistory(sensor).find((e) => e.kind === 'RAISED');
  return raised ? `raised ${agoLabel(raised.ts)}` : 'active';
}
