import type { SensorsListQuery } from '@/graphql/sensors.generated';
import type { Sensor, SensorStatus } from './types';

type GqlSensor = SensorsListQuery['sensors'][number];
type GqlRule = GqlSensor['rules'][number];

const round = (n: number) => Math.round(n * 10) / 10;

/** Derive the badge status from a sensor's rules. */
function deriveStatus(rules: GqlRule[]): SensorStatus {
  if (rules.length === 0) return 'NO_RULES';
  if (rules.some((r) => r.enabled && r.state === 'ALERTING')) return 'ALERTING';
  if (rules.every((r) => !r.enabled)) return 'PAUSED';
  return 'OK';
}

/**
 * Evenly sample a series down to at most `n` points for the sparkline, always
 * keeping the first and last (newest) points.
 */
function downsample(values: number[], n: number): number[] {
  if (values.length <= n || n < 2) return values;
  const last = values.length - 1;
  return Array.from(
    { length: n },
    (_, i) => values[Math.round((i / (n - 1)) * last)],
  );
}

/**
 * Map an API `Sensor` to the UI shape. `latest`/`series` derive from `readings`;
 * `status`, the representative `rule`, and `ruleCount` derive from the sensor's
 * alert `rules` (a sensor can have several).
 */
function toUiSensor(sensor: GqlSensor): Sensor {
  const ordered = [...sensor.readings].sort((a, b) =>
    a.time.localeCompare(b.time),
  );
  const values = ordered.map((r) => r.value);
  const newest = ordered.at(-1);
  const latest = newest ? newest.value : 0;
  const first = sensor.rules[0];

  return {
    id: sensor.id,
    name: sensor.name,
    type: sensor.type.key,
    typeLabel: sensor.type.label,
    unit: sensor.type.unit,
    latest: round(latest),
    latestAt: newest?.time ?? null,
    groupId: sensor.groupId ?? null,
    status: deriveStatus(sensor.rules),
    enabled: true,
    rule: first
      ? {
          direction: first.direction,
          threshold: first.threshold,
          clearThreshold: first.clearThreshold,
        }
      : undefined,
    ruleCount: sensor.rules.length,
    series: downsample(values, 48),
  };
}

export function toUiSensors(data: SensorsListQuery | undefined): Sensor[] {
  return data?.sensors.map(toUiSensor) ?? [];
}
