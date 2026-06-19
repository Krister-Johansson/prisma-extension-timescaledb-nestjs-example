import { z } from 'zod';

/**
 * Server-side mirror of the client widget config schemas (`apps/web/src/
 * components/dashboard/widget-config.ts`). The AI dashboard generator validates
 * the model's output against these before persisting, so generated widgets
 * match what the client can render. Kept intentionally close to the client
 * shape — when the client schemas change, update these too.
 */

export const WINDOW_UNITS = ['min', 'hour', 'day', 'week'] as const;
export const STAT_AGGS = ['last', 'avg', 'min', 'max'] as const;
export const SERIES_AGGS = ['AVG', 'MIN', 'MAX'] as const;
export const CHART_TYPES = ['line', 'area', 'bar'] as const;

// A relative look-back window. A plain object (not a wrapped/preprocessed
// schema) so the tool's JSON schema is explicit and the model emits
// { amount, unit } rather than falling back to a preset string. (Legacy preset
// strings from older stored configs are coerced client-side on read.)
const windowObject = z.object({
  amount: z.number().int().positive().max(1000),
  unit: z.enum(WINDOW_UNITS),
});
const windowField = (def: {
  amount: number;
  unit: (typeof WINDOW_UNITS)[number];
}) => windowObject.default(def);
const scopeEnum = z.enum(['sensor', 'group']);

const statConfig = z.object({
  title: z.string().max(60).optional(),
  scope: scopeEnum,
  sensorId: z.string().optional(),
  groupId: z.string().optional(),
  typeKey: z.string().optional(),
  agg: z.enum(STAT_AGGS).default('last'),
  window: windowField({ amount: 24, unit: 'hour' }),
  sparkline: z.boolean().default(true),
});

const gaugeConfig = z.object({
  title: z.string().max(60).optional(),
  scope: scopeEnum,
  sensorId: z.string().optional(),
  groupId: z.string().optional(),
  typeKey: z.string().optional(),
  agg: z.enum(STAT_AGGS).default('last'),
  window: windowField({ amount: 1, unit: 'hour' }),
  min: z.number().default(0),
  max: z.number().default(100),
  warn: z.number().optional(),
  danger: z.number().optional(),
});

const chartSeries = z.object({
  // A chart series is a sensor, a group+type aggregate, or a "delta" — the
  // difference of two other series in the same chart (by 0-based index).
  scope: z.enum(['sensor', 'group', 'delta']),
  sensorId: z.string().optional(),
  groupId: z.string().optional(),
  typeKey: z.string().optional(),
  agg: z.enum(SERIES_AGGS).default('AVG'),
  deltaA: z.number().int().optional(),
  deltaB: z.number().int().optional(),
  label: z.string().max(40).optional(),
});

const chartConfig = z.object({
  title: z.string().max(60).optional(),
  window: windowField({ amount: 7, unit: 'day' }),
  chartType: z.enum(CHART_TYPES).default('line'),
  series: z.array(chartSeries).min(1).max(6),
});

const alertsConfig = z.object({
  title: z.string().max(60).optional(),
  limit: z.number().int().min(1).max(50).default(8),
});

const tableConfig = z.object({
  title: z.string().max(60).optional(),
  groupId: z.string().optional(),
  typeKey: z.string().optional(),
});

const compareConfig = z.object({
  title: z.string().max(60).optional(),
  groupId: z.string().optional(),
  typeKey: z.string().optional(),
  agg: z.enum(SERIES_AGGS).default('AVG'),
  amount: z.number().int().min(1).max(999).default(1),
  unit: z.enum(['day', 'week']).default('week'),
  count: z.number().int().min(2).max(6).default(4),
});

/** Coerce a JSON-stringified object back to an object before validating. Models
 * frequently emit a nested tool-call field (`config`) as a stringified JSON blob
 * rather than a real object; without this the schema rejects it outright. */
const asObject = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => {
    if (typeof v === 'string') {
      try {
        // The parsed value is validated by the downstream schema; type it as
        // unknown so it doesn't escape type-checking (no-unsafe-return).
        return JSON.parse(v) as unknown;
      } catch {
        return v;
      }
    }
    return v;
  }, schema);

/** The `add_widget` tool input — a discriminated union so the model fills the
 * config shape that matches the chosen widget type. */
export const addWidgetInput = z.discriminatedUnion('type', [
  z.object({ type: z.literal('stat'), config: asObject(statConfig) }),
  z.object({ type: z.literal('gauge'), config: asObject(gaugeConfig) }),
  z.object({ type: z.literal('chart'), config: asObject(chartConfig) }),
  z.object({ type: z.literal('alerts'), config: asObject(alertsConfig) }),
  z.object({ type: z.literal('table'), config: asObject(tableConfig) }),
  z.object({ type: z.literal('compare'), config: asObject(compareConfig) }),
]);
export type AddWidgetInput = z.infer<typeof addWidgetInput>;

/** Default grid size per widget type (mirrors the client SIZE_PRESETS + each
 * type's defaultSize in widget-meta.ts). */
export const WIDGET_DEFAULT_SIZE: Record<string, { w: number; h: number }> = {
  stat: { w: 3, h: 3 },
  chart: { w: 8, h: 6 },
  gauge: { w: 4, h: 4 },
  alerts: { w: 6, h: 5 },
  table: { w: 6, h: 5 },
  compare: { w: 8, h: 6 },
};

type SourceLike = {
  scope: string;
  sensorId?: string;
  groupId?: string;
  typeKey?: string;
};

function sourceReason(c: SourceLike): string | null {
  if (c.scope === 'sensor')
    return c.sensorId ? null : 'sensor scope requires a sensorId';
  return c.groupId && c.typeKey
    ? null
    : 'group scope requires a groupId and a typeKey';
}

type ChartSeriesLike = SourceLike & { deltaA?: number; deltaB?: number };

function chartSeriesReason(s: ChartSeriesLike, count: number): string | null {
  if (s.scope === 'delta') {
    if (s.deltaA == null || s.deltaB == null)
      return 'a delta series requires deltaA and deltaB (0-based indexes of two other series in this chart)';
    const ok = (n: number) => Number.isInteger(n) && n >= 0 && n < count;
    return ok(s.deltaA) && ok(s.deltaB)
      ? null
      : 'delta deltaA/deltaB must index existing series in this chart';
  }
  return sourceReason(s);
}

/** Why a generated widget can't be rendered yet, or null if it's complete.
 * Lets the tool reject under-specified widgets so the model self-corrects. */
export function widgetIncompleteReason(w: AddWidgetInput): string | null {
  switch (w.type) {
    case 'stat':
    case 'gauge':
      return sourceReason(w.config);
    case 'chart': {
      for (const s of w.config.series) {
        const r = chartSeriesReason(s, w.config.series.length);
        if (r) return `a chart series is invalid: ${r}`;
      }
      return null;
    }
    case 'compare':
      return w.config.groupId && w.config.typeKey
        ? null
        : 'a comparison needs a groupId and a typeKey';
    default:
      return null;
  }
}
