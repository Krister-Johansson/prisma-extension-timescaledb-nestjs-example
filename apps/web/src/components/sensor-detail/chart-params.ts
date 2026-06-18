import { z } from 'zod';

export const RESOLUTIONS = ['minute', 'hour', 'day', 'week'] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

export const RANGES = ['1h', '24h', '7d', '30d', '90d'] as const;
export type RangeKey = (typeof RANGES)[number];

export const TABS = ['data', 'alert'] as const;
export type TabKey = (typeof TABS)[number];

/** The default live view (also what the Reset control restores). */
export const DEFAULT_RES: Resolution = 'hour';
export const DEFAULT_RANGE: RangeKey = '24h';

/** URL search schema for the sensor detail chart. `.catch` (not `.default`) so
 * a missing *or* tampered param (`?res=foo`) falls back instead of breaking the
 * route — defaults give a live, 24h-of-hourly view. */
export const chartSearchSchema = z.object({
  res: z.enum(RESOLUTIONS).catch(DEFAULT_RES),
  range: z.enum(RANGES).catch(DEFAULT_RANGE),
  // A valid from+to pair switches the chart to a fixed (non-live) window.
  // Kept as plain strings; validity is checked where the window resolves, so a
  // bad value just falls back to the live range rather than breaking the route.
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
  tab: z.enum(TABS).catch('data'),
});
export type ChartSearch = z.infer<typeof chartSearchSchema>;

/** Resolution → Postgres `time_bucket` interval. */
export const BUCKET_INTERVAL: Record<Resolution, string> = {
  minute: '1 minute',
  hour: '1 hour',
  day: '1 day',
  week: '1 week',
};

export const BUCKET_MS: Record<Resolution, number> = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
};

export const RESOLUTION_LABEL: Record<Resolution, string> = {
  minute: 'Minute',
  hour: 'Hour',
  day: 'Day',
  week: 'Week',
};

export const RANGE_MS: Record<RangeKey, number> = {
  '1h': 3_600_000,
  '24h': 86_400_000,
  '7d': 604_800_000,
  '30d': 2_592_000_000,
  '90d': 7_776_000_000,
};

export const RANGE_LABEL: Record<RangeKey, string> = {
  '1h': 'Last hour',
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

/** Guard: above this many buckets the chart is unreadable and the query heavy. */
export const MAX_POINTS = 1500;

/** Estimated bucket count for a resolution + window span. */
export function estimatePoints(res: Resolution, spanMs: number): number {
  return Math.ceil(spanMs / BUCKET_MS[res]);
}

/** Axis/tooltip label for a bucket timestamp, scaled to the resolution. */
export function formatBucketLabel(iso: string, res: Resolution): string {
  const d = new Date(iso);
  if (res === 'minute' || res === 'hour') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
