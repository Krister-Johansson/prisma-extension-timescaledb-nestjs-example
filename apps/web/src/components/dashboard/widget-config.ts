import { z } from 'zod';

/** A relative look-back window: "the last <amount> <unit>" (e.g. 14 days). */
export const WINDOW_UNITS = ['min', 'hour', 'day', 'week'] as const;
export type WindowUnit = (typeof WINDOW_UNITS)[number];
export interface WindowSpec {
  amount: number;
  unit: WindowUnit;
}

const UNIT_MS: Record<WindowUnit, number> = {
  min: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
};
export const WINDOW_UNIT_LABEL: Record<WindowUnit, string> = {
  min: 'Minutes',
  hour: 'Hours',
  day: 'Days',
  week: 'Weeks',
};
const UNIT_NOUN: Record<WindowUnit, [string, string]> = {
  min: ['minute', 'minutes'],
  hour: ['hour', 'hours'],
  day: ['day', 'days'],
  week: ['week', 'weeks'],
};

export const windowMs = (w: WindowSpec) => w.amount * UNIT_MS[w.unit];

/** "Last 14 days", "Last hour", … */
export function windowLabel(w: WindowSpec): string {
  const [one, many] = UNIT_NOUN[w.unit];
  return w.amount === 1 ? `Last ${one}` : `Last ${w.amount} ${many}`;
}

/** Axis ticks read as dates once the span covers a couple of days. */
export const windowIsMultiDay = (w: WindowSpec) => windowMs(w) >= 2 * UNIT_MS.day;

// A ladder of "nice" bucket intervals (Postgres interval string + ms). The
// bucket is auto-chosen so a window renders ~a few dozen points.
const BUCKET_LADDER: { interval: string; ms: number }[] = [
  { interval: '1 minute', ms: 60_000 },
  { interval: '5 minutes', ms: 300_000 },
  { interval: '15 minutes', ms: 900_000 },
  { interval: '30 minutes', ms: 1_800_000 },
  { interval: '1 hour', ms: 3_600_000 },
  { interval: '3 hours', ms: 10_800_000 },
  { interval: '6 hours', ms: 21_600_000 },
  { interval: '12 hours', ms: 43_200_000 },
  { interval: '1 day', ms: 86_400_000 },
  { interval: '2 days', ms: 172_800_000 },
  { interval: '1 week', ms: 604_800_000 },
];
const TARGET_POINTS = 48;

/** The smallest ladder bucket that keeps a span at/under ~TARGET_POINTS points. */
export function bucketFor(spanMs: number): { interval: string; ms: number } {
  const desired = spanMs / TARGET_POINTS;
  return (
    BUCKET_LADDER.find((b) => b.ms >= desired) ??
    BUCKET_LADDER[BUCKET_LADDER.length - 1]
  );
}
export const windowBucketInterval = (w: WindowSpec) =>
  bucketFor(windowMs(w)).interval;

/**
 * Snap the [now − window, now] range to the window's bucket boundary. Because
 * the result only changes when the bucket *advances* (not on every live tick),
 * the query variables stay stable within a bucket — so Apollo serves the cache
 * instead of refetching every widget every few seconds. The current, in-progress
 * bucket is included so the latest data still shows.
 */
export function bucketedWindow(
  w: WindowSpec,
  nowMs: number,
): { start: string; end: string } {
  const span = windowMs(w);
  const step = bucketFor(span).ms;
  const end = Math.floor(nowMs / step) * step + step;
  return {
    start: new Date(end - span).toISOString(),
    end: new Date(end).toISOString(),
  };
}

/** Legacy preset windows (stored before relative windows) → WindowSpec. */
const LEGACY_WINDOW: Record<string, WindowSpec> = {
  '1h': { amount: 1, unit: 'hour' },
  '6h': { amount: 6, unit: 'hour' },
  '24h': { amount: 24, unit: 'hour' },
  '7d': { amount: 7, unit: 'day' },
  '30d': { amount: 30, unit: 'day' },
};
const windowObjSchema = z.object({
  amount: z.number().int().positive().max(1000),
  unit: z.enum(WINDOW_UNITS),
});
/** Parse a window, coercing the old `"7d"` preset strings to a WindowSpec. */
const windowSchema = z.preprocess(
  (v) => (typeof v === 'string' && LEGACY_WINDOW[v]) || v,
  windowObjSchema,
);
const windowField = (def: WindowSpec) => windowSchema.catch(def);

/** How a Stat widget reduces its windowed series to one number. */
export const STAT_AGGS = ['last', 'avg', 'min', 'max'] as const;
export type StatAgg = (typeof STAT_AGGS)[number];
export const STAT_AGG_LABEL: Record<StatAgg, string> = {
  last: 'Current',
  avg: 'Average',
  min: 'Minimum',
  max: 'Maximum',
};

const c = <T>(schema: z.ZodType<T>, fallback: T) => schema.catch(fallback);

/**
 * Stat widget config. A "source" is either a single sensor or a group + type
 * (averaged across the group's subtree). Parsed leniently so a malformed or
 * partial blob still yields a usable widget rather than throwing.
 */
const statConfigSchema = z.object({
  title: c(z.string().max(60).optional(), undefined),
  scope: c(z.enum(['sensor', 'group']), 'sensor'),
  sensorId: c(z.string().optional(), undefined),
  groupId: c(z.string().optional(), undefined),
  typeKey: c(z.string().optional(), undefined),
  agg: c(z.enum(STAT_AGGS), 'last'),
  window: windowField({ amount: 24, unit: 'hour' }),
  sparkline: c(z.boolean(), true),
});
export type StatConfig = z.infer<typeof statConfigSchema>;

export function parseStatConfig(config: unknown): StatConfig {
  return statConfigSchema.parse(config ?? {});
}

/** Whether a stat config has enough to render (a chosen source). */
export function statConfigComplete(cfg: StatConfig): boolean {
  return cfg.scope === 'sensor'
    ? Boolean(cfg.sensorId)
    : Boolean(cfg.groupId && cfg.typeKey);
}

// ---- chart widget ----------------------------------------------------------

export const SERIES_AGGS = ['AVG', 'MIN', 'MAX'] as const;
export type SeriesAggKey = (typeof SERIES_AGGS)[number];
export const CHART_TYPES = ['line', 'area', 'bar'] as const;
export type ChartType = (typeof CHART_TYPES)[number];

/** One line/series on a chart: a single sensor, a group + type aggregate, or a
 * "delta" — the computed difference between two other series in the same chart
 * (`series[deltaA] − series[deltaB]`, by their 0-based index). */
const chartSeriesSchema = z.object({
  scope: c(z.enum(['sensor', 'group', 'delta']), 'group'),
  sensorId: c(z.string().optional(), undefined),
  groupId: c(z.string().optional(), undefined),
  typeKey: c(z.string().optional(), undefined),
  agg: c(z.enum(SERIES_AGGS), 'AVG'),
  deltaA: c(z.number().int().optional(), undefined),
  deltaB: c(z.number().int().optional(), undefined),
  label: c(z.string().max(40).optional(), undefined),
});
export type ChartSeries = z.infer<typeof chartSeriesSchema>;

const chartConfigSchema = z.object({
  title: c(z.string().max(60).optional(), undefined),
  window: windowField({ amount: 7, unit: 'day' }),
  chartType: c(z.enum(CHART_TYPES), 'line'),
  series: c(z.array(chartSeriesSchema).max(6), [] as ChartSeries[]),
});
export type ChartConfig = z.infer<typeof chartConfigSchema>;

export function parseChartConfig(config: unknown): ChartConfig {
  return chartConfigSchema.parse(config ?? {});
}

export function chartSeriesComplete(s: ChartSeries): boolean {
  if (s.scope === 'delta') return s.deltaA != null && s.deltaB != null;
  return s.scope === 'sensor'
    ? Boolean(s.sensorId)
    : Boolean(s.groupId && s.typeKey);
}

// ---- gauge widget ----------------------------------------------------------

/** A gauge reuses the Stat source + reduces to a value, shown against a range
 * with optional warning/danger thresholds. */
const gaugeConfigSchema = z.object({
  title: c(z.string().max(60).optional(), undefined),
  scope: c(z.enum(['sensor', 'group']), 'group'),
  sensorId: c(z.string().optional(), undefined),
  groupId: c(z.string().optional(), undefined),
  typeKey: c(z.string().optional(), undefined),
  agg: c(z.enum(STAT_AGGS), 'last'),
  window: windowField({ amount: 1, unit: 'hour' }),
  min: c(z.number(), 0),
  max: c(z.number(), 100),
  warn: c(z.number().optional(), undefined),
  danger: c(z.number().optional(), undefined),
});
export type GaugeConfig = z.infer<typeof gaugeConfigSchema>;
export const parseGaugeConfig = (config: unknown): GaugeConfig =>
  gaugeConfigSchema.parse(config ?? {});
export const gaugeConfigComplete = (cfg: GaugeConfig): boolean =>
  cfg.scope === 'sensor'
    ? Boolean(cfg.sensorId)
    : Boolean(cfg.groupId && cfg.typeKey);

// ---- alerts widget ---------------------------------------------------------

const alertsConfigSchema = z.object({
  title: c(z.string().max(60).optional(), undefined),
  limit: c(z.number().int().min(1).max(50), 8),
});
export type AlertsConfig = z.infer<typeof alertsConfigSchema>;
export const parseAlertsConfig = (config: unknown): AlertsConfig =>
  alertsConfigSchema.parse(config ?? {});

// ---- sensor table widget ---------------------------------------------------

/** Empty group/type = all sensors. group includes the whole subtree. */
const tableConfigSchema = z.object({
  title: c(z.string().max(60).optional(), undefined),
  groupId: c(z.string().optional(), undefined),
  typeKey: c(z.string().optional(), undefined),
});
export type TableConfig = z.infer<typeof tableConfigSchema>;
export const parseTableConfig = (config: unknown): TableConfig =>
  tableConfigSchema.parse(config ?? {});
