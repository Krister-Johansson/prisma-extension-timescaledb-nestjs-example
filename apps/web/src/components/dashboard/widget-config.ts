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
export const statConfigSchema = z.object({
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
