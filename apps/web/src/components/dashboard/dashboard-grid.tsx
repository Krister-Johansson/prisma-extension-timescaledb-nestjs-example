import { useEffect, useState } from 'react';
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

const toLayout = (widgets: WidgetFieldsFragment[]): Layout =>
  widgets.map((w) => ({
    i: w.id,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
    minW: 2,
    minH: 2,
  }));

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
  const [layout, setLayout] = useState<Layout>(() => toLayout(widgets));

  // Re-sync only when the widget set changes structurally (add/remove/resize from
  // a config), not on our own in-flight drags — keyed on a position signature.
  const sig = widgets
    .map((w) => `${w.id}:${w.x},${w.y},${w.w},${w.h}`)
    .join('|');
  useEffect(() => {
    setLayout(toLayout(widgets));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sig encodes widgets
  }, [sig]);

  const persist = (current: Layout) => {
    // Only persist edits made on the canonical 12-col (lg) layout — the backend
    // stores one x/y/w/h per widget, so saving a reflowed small-screen layout
    // would corrupt the desktop arrangement.
    if (breakpointFor(width) !== 'lg') return;
    onPersist(current.map((l) => ({ id: l.i, x: l.x, y: l.y, w: l.w, h: l.h })));
  };

  return (
    <div ref={containerRef} className="pb-6">
      {mounted && (
        <Responsive
          className="dashboard-grid"
          layouts={{ lg: layout, md: layout, sm: layout, xs: layout, xxs: layout }}
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
          onLayoutChange={(current) => setLayout(current)}
          onDragStop={(current) => persist(current)}
          onResizeStop={(current) => persist(current)}
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
