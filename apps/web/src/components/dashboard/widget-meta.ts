import type { WidgetFieldsFragment } from '@/graphql/dashboards.generated';

export const GRID_COLS = 12;
export const ROW_HEIGHT = 56;

/** Size presets (grid units on a 12-col grid) — xl spans the full width. */
export const SIZE_PRESETS = {
  xs: { w: 3, h: 3 },
  s: { w: 4, h: 4 },
  m: { w: 6, h: 5 },
  l: { w: 8, h: 6 },
  xl: { w: 12, h: 6 },
} as const;
export type SizeKey = keyof typeof SIZE_PRESETS;
export const SIZE_KEYS = Object.keys(SIZE_PRESETS) as SizeKey[];

export interface WidgetTypeMeta {
  label: string;
  description: string;
  defaultSize: SizeKey;
}

export const WIDGET_TYPES: Record<string, WidgetTypeMeta> = {
  stat: {
    label: 'Stat',
    description: 'A single current value (latest or average) with unit.',
    defaultSize: 'xs',
  },
  chart: {
    label: 'Chart',
    description: 'A time-series chart — one or more series over a range.',
    defaultSize: 'l',
  },
  gauge: {
    label: 'Gauge',
    description: 'A value against good / warning / bad zones.',
    defaultSize: 's',
  },
  alerts: {
    label: 'Alerts',
    description: 'Currently firing alerts and recent events.',
    defaultSize: 'm',
  },
  table: {
    label: 'Sensors',
    description: 'A table of sensors with their latest values.',
    defaultSize: 'm',
  },
};

/** Best-effort widget title: an explicit config.title, else the type label. */
export function widgetTitle(widget: WidgetFieldsFragment): string {
  const title = (widget.config as { title?: unknown } | null)?.title;
  if (typeof title === 'string' && title.trim()) return title;
  return WIDGET_TYPES[widget.type]?.label ?? widget.type;
}
