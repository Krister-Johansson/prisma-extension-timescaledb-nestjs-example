import { z } from 'zod';

/** Relative time windows a widget can look back over. */
export const WINDOWS = ['1h', '6h', '24h', '7d', '30d'] as const;
export type Window = (typeof WINDOWS)[number];
export const WINDOW_MS: Record<Window, number> = {
  '1h': 3_600_000,
  '6h': 21_600_000,
  '24h': 86_400_000,
  '7d': 604_800_000,
  '30d': 2_592_000_000,
};
export const WINDOW_LABEL: Record<Window, string> = {
  '1h': 'Last hour',
  '6h': 'Last 6 hours',
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
};
/** A sensible bucket interval for a window (≈ a few dozen points). */
export const WINDOW_BUCKET: Record<Window, string> = {
  '1h': '5 minutes',
  '6h': '15 minutes',
  '24h': '1 hour',
  '7d': '6 hours',
  '30d': '1 day',
};
/** WINDOW_BUCKET as milliseconds — used to snap the query window to the bucket. */
export const WINDOW_BUCKET_MS: Record<Window, number> = {
  '1h': 300_000,
  '6h': 900_000,
  '24h': 3_600_000,
  '7d': 21_600_000,
  '30d': 86_400_000,
};

/**
 * Snap the [now − window, now] range to the window's bucket boundary. Because
 * the result only changes when the bucket *advances* (not on every live tick),
 * the query variables stay stable within a bucket — so Apollo serves the cache
 * instead of refetching every widget every few seconds. The current, in-progress
 * bucket is included so the latest data still shows.
 */
export function bucketedWindow(
  window: Window,
  nowMs: number,
): { start: string; end: string } {
  const step = WINDOW_BUCKET_MS[window];
  const end = Math.floor(nowMs / step) * step + step;
  return {
    start: new Date(end - WINDOW_MS[window]).toISOString(),
    end: new Date(end).toISOString(),
  };
}

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
  window: c(z.enum(WINDOWS), '24h'),
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
  window: c(z.enum(WINDOWS), '7d'),
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
  window: c(z.enum(WINDOWS), '1h'),
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
