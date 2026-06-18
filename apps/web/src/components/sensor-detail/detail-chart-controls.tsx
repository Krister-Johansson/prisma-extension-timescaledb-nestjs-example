import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  formatWindowLabel,
  type TimeWindow,
  toDateInput,
} from './chart-window';

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
  // Local copies of the date inputs, re-seeded whenever the window changes.
  const [startDate, setStartDate] = useState(() => toDateInput(window.startMs));
  const [endDate, setEndDate] = useState(() => toDateInput(window.endMs - 1));
  useEffect(() => {
    setStartDate(toDateInput(window.startMs));
    setEndDate(toDateInput(window.endMs - 1));
  }, [window.startMs, window.endMs]);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Select
            value={res}
            onValueChange={(v) => onResChange(v as Resolution)}
          >
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

      <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
        <span>Custom:</span>
        <Input
          type="date"
          value={startDate}
          max={endDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-7 w-[140px] text-[12px]"
        />
        <span>→</span>
        <Input
          type="date"
          value={endDate}
          min={startDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="h-7 w-[140px] text-[12px]"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-7"
          disabled={!startDate || !endDate}
          onClick={() => onApplyDates(startDate, endDate)}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
