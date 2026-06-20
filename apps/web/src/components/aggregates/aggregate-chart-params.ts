import { z } from 'zod';
import {
  DEFAULT_RANGE,
  DEFAULT_RES,
  RANGES,
  RESOLUTIONS,
} from '@/components/sensor-detail/chart-params';

export const SERIES_AGGS = ['AVG', 'MIN', 'MAX'] as const;
const SCALES = ['normalized', 'real'] as const;
export type Scale = (typeof SCALES)[number];

/** One overlay series spec (compact for the URL): group id `g`, optional
 * measurement type key `t` (omit = all types), aggregate `agg`. */
const overlaySeriesSchema = z.object({
  g: z.string(),
  t: z.string().optional(),
  agg: z.enum(SERIES_AGGS).catch('AVG'),
});
export type OverlaySeries = z.infer<typeof overlaySeriesSchema>;

/** URL search for the Aggregates page — window controls (shared by the compare
 * chart) plus the overlay `series` specs. */
export const aggregateSearchSchema = z.object({
  res: z.enum(RESOLUTIONS).catch(DEFAULT_RES),
  range: z.enum(RANGES).catch(DEFAULT_RANGE),
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
  series: z.array(overlaySeriesSchema).catch([]),
  // Compare-chart filters: a group (its subtree) + a measurement type, and the
  // y-axis scale (each line normalized to its own range, or real values).
  group: z.string().optional().catch(undefined),
  type: z.string().optional().catch(undefined),
  scale: z.enum(SCALES).catch('normalized'),
});
export type AggregateSearch = z.infer<typeof aggregateSearchSchema>;
