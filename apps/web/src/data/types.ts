/** Measurement type key — dynamic now (any SensorType.key), so just a string. */
export type SensorType = string;
export type AlertDirection = 'ABOVE' | 'BELOW';

/** Derived status shown on badges across the app. */
export type SensorStatus = 'OK' | 'ALERTING' | 'WARNING' | 'PAUSED' | 'NO_RULES';

export interface AlertRule {
  direction: AlertDirection;
  threshold: number;
  clearThreshold: number;
}

export interface Sensor {
  id: string;
  name: string;
  /** Measurement type key (e.g. 'CO2') — for chips + grouping. */
  type: SensorType;
  /** Human label for the type (e.g. 'CO₂'). */
  typeLabel: string;
  /** Unit, sourced from the sensor's type. */
  unit: string;
  latest: number;
  /** ISO timestamp of the latest reading, or null if none. */
  latestAt?: string | null;
  status: SensorStatus;
  enabled: boolean;
  /** Group this sensor is attached to, if any. */
  groupId?: string | null;
  /** Representative rule (the first), used for a one-line summary. */
  rule?: AlertRule;
  /** How many alert rules the sensor has (a sensor can have several). */
  ruleCount?: number;
  /** Last 24h of readings (oldest → newest) for sparklines/charts. */
  series: number[];
}
