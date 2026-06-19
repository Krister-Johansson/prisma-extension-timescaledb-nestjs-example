import { useMemo, useState } from 'react';
// The v2 core restructured drag/resize into a `gridConfig` object the responsive
// component doesn't expose; the `/legacy` entry keeps the classic flat props
// (isDraggable, draggableHandle, onDragStop, …) on the same React-19-safe core.
import { useContainerWidth } from 'react-grid-layout';
import { Responsive, type Layout } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import type { WidgetFieldsFragment } from '@/graphql/dashboards.generated';
import { GRID_COLS, ROW_HEIGHT } from './widget-meta';
import { WidgetFrame } from './widget-frame';

const BREAKPOINTS = { lg: 1100, md: 850, sm: 640, xs: 480, xxs: 0 };
const COLS = { lg: GRID_COLS, md: GRID_COLS, sm: 6, xs: 4, xxs: 2 };
const BP_ORDER = ['lg', 'md', 'sm', 'xs', 'xxs'] as const;

/** The active breakpoint for a width — largest whose min-width fits. */
const breakpointFor = (width: number) =>
  BP_ORDER.find((bp) => width >= BREAKPOINTS[bp]) ?? 'xxs';

export interface LayoutItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
type Pos = { x: number; y: number; w: number; h: number };

export function DashboardGrid({
  widgets,
  locked,
  onPersist,
  onConfigure,
  onRemove,
}: {
  widgets: WidgetFieldsFragment[];
  locked: boolean;
  onPersist: (items: LayoutItem[]) => void;
  onConfigure: (w: WidgetFieldsFragment) => void;
  onRemove: (w: WidgetFieldsFragment) => void;
}) {
  const { width, containerRef, mounted } = useContainerWidth();
  // Positions changed by drag/resize this session (not yet reflected in props).
  const [overrides, setOverrides] = useState<Record<string, Pos>>({});

  // Layout is DERIVED from the current widgets (+ session overrides) every
  // render, so it always has exactly one entry per rendered child. That avoids
  // the controlled-state lag where rgl sees a child with no layout entry,
  // regenerates one, fires onLayoutChange → setState → re-render → repeat
  // ("Maximum update depth"). There is intentionally no onLayoutChange handler.
  const sig = widgets
    .map((w) => `${w.id}:${w.x},${w.y},${w.w},${w.h}`)
    .join('|');
  const layouts = useMemo(() => {
    const layout: Layout = widgets.map((w) => {
      const o = overrides[w.id];
      return {
        i: w.id,
        x: o?.x ?? w.x,
        y: o?.y ?? w.y,
        w: o?.w ?? w.w,
        h: o?.h ?? w.h,
        minW: 2,
        minH: 2,
      };
    });
    return { lg: layout, md: layout, sm: layout, xs: layout, xxs: layout };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sig encodes widgets
  }, [sig, overrides]);

  const commit = (current: Layout) => {
    // Only persist edits made on the canonical 12-col (lg) layout — the backend
    // stores one x/y/w/h per widget, so saving a reflowed small-screen layout
    // would corrupt the desktop arrangement.
    if (breakpointFor(width) !== 'lg') return;
    setOverrides((prev) => {
      const next = { ...prev };
      for (const l of current) next[l.i] = { x: l.x, y: l.y, w: l.w, h: l.h };
      return next;
    });
    onPersist(current.map((l) => ({ id: l.i, x: l.x, y: l.y, w: l.w, h: l.h })));
  };

  return (
    <div ref={containerRef} className="pb-6">
      {mounted && (
        <Responsive
          className="dashboard-grid"
          layouts={layouts}
          width={width}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          margin={[14, 14]}
          containerPadding={[0, 0]}
          isDraggable={!locked}
          isResizable={!locked}
          draggableHandle=".widget-grip"
          compactType="vertical"
          preventCollision={false}
          resizeHandles={['se']}
          onDragStop={(current) => commit(current)}
          onResizeStop={(current) => commit(current)}
        >
          {widgets.map((w) => (
            <div key={w.id}>
              <WidgetFrame
                widget={w}
                locked={locked}
                onConfigure={() => onConfigure(w)}
                onRemove={() => onRemove(w)}
              />
            </div>
          ))}
        </Responsive>
      )}
    </div>
  );
}
