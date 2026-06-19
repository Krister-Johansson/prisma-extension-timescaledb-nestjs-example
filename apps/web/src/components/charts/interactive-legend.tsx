import { cn } from '@/lib/utils';
import type { LegendItem, SeriesToggle } from './use-series-toggle';

interface LegendProps extends Pick<
  SeriesToggle,
  'hidden' | 'toggle' | 'setHovered'
> {
  items: LegendItem[];
  /** A dot (default) or a short line — match the chart's series style. */
  marker?: 'dot' | 'line';
  className?: string;
  textClassName?: string;
}

/** A legend whose items isolate on hover and toggle on click. */
export function InteractiveLegend({
  items,
  hidden,
  toggle,
  setHovered,
  marker = 'dot',
  className,
  textClassName,
}: LegendProps) {
  return (
    <div className={cn('flex flex-wrap gap-x-3 gap-y-1', className)}>
      {items.map((it) => {
        const off = hidden.has(it.key);
        return (
          <button
            key={it.key}
            type="button"
            aria-pressed={!off}
            onClick={() => toggle(it.key)}
            onMouseEnter={() => setHovered(it.key)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(it.key)}
            onBlur={() => setHovered(null)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring',
              off ? 'opacity-40 line-through' : 'opacity-100',
              textClassName ?? 'text-[10.5px]',
            )}
          >
            <span
              className={cn(
                'flex-none',
                marker === 'line' ? 'h-[3px] w-2.5 rounded' : 'size-2 rounded-full',
              )}
              style={{ background: it.color }}
            />
            <span className="max-w-[140px] truncate">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
