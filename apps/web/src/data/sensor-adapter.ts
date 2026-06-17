import type { SensorsListQuery } from '@/graphql/sensors.generated';
import type { Sensor } from './types';

type GqlSensor = SensorsListQuery['sensors'][number];

const round = (n: number) => Math.round(n * 10) / 10;

/** Evenly sample a series down to at most `n` points for the sparkline. */
function downsample(values: number[], n: number): number[] {
  if (values.length <= n) return values;
  const step = values.length / n;
  return Array.from({ length: n }, (_, i) => values[Math.floor(i * step)]);
}

/**
 * Map an API `Sensor` to the UI shape. `latest` and the sparkline `series` are
 * derived from `readings`. Alert `status`/`rule` aren't part of this query yet,
 * so status is reported as NO_RULES (consistent with the empty rule) until the
 * alert-rule fields are wired in a later PR.
 */
export function toUiSensor(sensor: GqlSensor): Sensor {
  const ordered = [...sensor.readings].sort((a, b) =>
    a.time.localeCompare(b.time),
  );
  const values = ordered.map((r) => r.value);
  const latest = values.length ? values[values.length - 1] : 0;

  return {
    id: sensor.id,
    name: sensor.name,
    type: sensor.type,
    unit: sensor.unit,
    latest: round(latest),
    status: 'NO_RULES',
    enabled: true,
    rule: undefined,
    series: downsample(values, 48),
  };
}

export function toUiSensors(data: SensorsListQuery | undefined): Sensor[] {
  return data?.sensors.map(toUiSensor) ?? [];
}
