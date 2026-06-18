import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RANGE_LABEL,
  RANGES,
  type RangeKey,
  type Resolution,
  RESOLUTION_LABEL,
  RESOLUTIONS,
} from './chart-params';
import { formatWindowLabel, type TimeWindow } from './chart-window';
import { DetailDateRange } from './detail-date-range';

interface Props {
  res: Resolution;
  range: RangeKey;
  live: boolean;
  window: TimeWindow;
  onResChange: (res: Resolution) => void;
  onRangeChange: (range: RangeKey) => void;
  onShift: (dir: -1 | 1) => void;
  onLive: () => void;
  onApplyDates: (start: string, end: string) => void;
}

export function DetailChartControls({
  res,
  range,
  live,
  window,
  onResChange,
  onRangeChange,
  onShift,
  onLive,
  onApplyDates,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={res} onValueChange={(v) => onResChange(v as Resolution)}>
          <SelectTrigger size="sm" className="w-[108px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESOLUTIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {RESOLUTION_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={range}
          onValueChange={(v) => onRangeChange(v as RangeKey)}
        >
          <SelectTrigger size="sm" className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r} value={r}>
                {RANGE_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DetailDateRange window={window} live={live} onApply={onApplyDates} />
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Previous window"
          onClick={() => onShift(-1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-[180px] text-center font-mono text-[11px] text-muted-foreground">
          {formatWindowLabel(window, res)}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Next window"
          disabled={live}
          onClick={() => onShift(1)}
        >
          <ChevronRight className="size-4" />
        </Button>
        {live ? (
          <span className="ml-1 inline-flex items-center gap-1.5 font-mono text-[10.5px] text-ok">
            <span className="size-[7px] animate-pulse rounded-full bg-ok" />
            LIVE
          </span>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="ml-1 h-7"
            onClick={onLive}
          >
            Live
          </Button>
        )}
      </div>
    </div>
  );
}
