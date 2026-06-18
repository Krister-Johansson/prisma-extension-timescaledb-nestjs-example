import { z } from 'zod';
import {
  DEFAULT_RANGE,
  DEFAULT_RES,
  RANGES,
  RESOLUTIONS,
} from '@/components/sensor-detail/chart-params';

export const SENSOR_TYPES = ['TEMPERATURE', 'PRESSURE', 'HUMIDITY'] as const;
export const SERIES_AGGS = ['AVG', 'MIN', 'MAX'] as const;

/** One overlay series spec (compact for the URL): group id `g`, optional sensor
 * type `t` (omit = all types), aggregate `agg`. */
export const overlaySeriesSchema = z.object({
  g: z.string(),
  t: z.enum(SENSOR_TYPES).optional(),
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
});
export type AggregateSearch = z.infer<typeof aggregateSearchSchema>;
