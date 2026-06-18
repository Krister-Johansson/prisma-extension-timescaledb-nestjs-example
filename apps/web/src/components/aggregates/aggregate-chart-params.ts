import { z } from 'zod';
import {
  DEFAULT_RANGE,
  DEFAULT_RES,
  RANGES,
  RESOLUTIONS,
} from '@/components/sensor-detail/chart-params';

/** URL search for the Aggregates compare chart — same window controls as the
 * sensor-detail chart (resolution + range + custom from/to). */
export const aggregateSearchSchema = z.object({
  res: z.enum(RESOLUTIONS).catch(DEFAULT_RES),
  range: z.enum(RANGES).catch(DEFAULT_RANGE),
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
});
export type AggregateSearch = z.infer<typeof aggregateSearchSchema>;
