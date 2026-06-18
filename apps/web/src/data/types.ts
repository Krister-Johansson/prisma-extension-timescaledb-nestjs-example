export type SensorType = 'TEMPERATURE' | 'PRESSURE' | 'HUMIDITY';
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
  type: SensorType;
  unit: string;
  latest: number;
  /** ISO timestamp of the latest reading, or null if none. */
  latestAt?: string | null;
  status: SensorStatus;
  enabled: boolean;
  /** Representative rule (the first), used for a one-line summary. */
  rule?: AlertRule;
  /** How many alert rules the sensor has (a sensor can have several). */
  ruleCount?: number;
  /** Last 24h of readings (oldest → newest) for sparklines/charts. */
  series: number[];
}
