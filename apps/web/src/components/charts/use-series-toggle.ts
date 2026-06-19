import { useState } from 'react';

/** One entry in an interactive chart legend. `key` matches the recharts series
 * `dataKey`. */
export interface LegendItem {
  key: string;
  label: string;
  color: string;
}

export interface SeriesToggle {
  hidden: Set<string>;
  hovered: string | null;
  setHovered: (key: string | null) => void;
  toggle: (key: string) => void;
  /** Render state for the series with `key`: `hide` removes it (click-toggle);
   * `dim` is true when another series is hovered (so this one fades). */
  seriesProps: (key: string) => { hide: boolean; dim: boolean };
}

/** Stroke/fill opacity for a recharts series given its toggle state. */
export const DIM_OPACITY = 0.18;
export const dimStroke = (dim: boolean) => (dim ? DIM_OPACITY : 1);

/**
 * Shared "hover to isolate, click to toggle" behaviour for any multi-series
 * chart. Hovering a legend item dims every other series; clicking it hides or
 * shows that series. Paired with <InteractiveLegend> to keep this consistent
 * across all charts.
 *
 * Pass `resetKey` (e.g. the series count/signature) when series can be
 * added/removed/reordered: index-based keys would otherwise point at a
 * different series after the set changes, so the hidden/hover state is cleared
 * whenever `resetKey` changes.
 */
export function useSeriesToggle(resetKey?: string | number): SeriesToggle {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [hovered, setHovered] = useState<string | null>(null);

  // Reset on structural change (the documented "adjust state during render"
  // pattern — no effect needed).
  const [prevKey, setPrevKey] = useState(resetKey);
  if (resetKey !== prevKey) {
    setPrevKey(resetKey);
    if (hidden.size > 0) setHidden(new Set());
    if (hovered !== null) setHovered(null);
  }

  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const seriesProps = (key: string) => ({
    hide: hidden.has(key),
    // If the hovered series is itself hidden (e.g. clicked to hide while
    // hovered), don't dim the rest — there's nothing to isolate.
    dim: hovered != null && !hidden.has(hovered) && hovered !== key,
  });

  return { hidden, hovered, setHovered, toggle, seriesProps };
}
