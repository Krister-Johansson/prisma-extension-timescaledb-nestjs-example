import { useQuery } from '@apollo/client/react';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SensorReadingsBucketedDocument } from '@/graphql/sensors.generated';
import { cn } from '@/lib/utils';
import {
  RANGE_LABEL,
  RANGES,
  type RangeKey,
} from './chart-params';
import { formatWindowLabel, type TimeWindow, toDateInput } from './chart-window';

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * One control for the chart's time window: quick presets *or* a custom range —
 * never both. A popover holds the presets (left) and a range calendar (right);
 * the calendar marks today and the days that actually have readings.
 */
export function DetailRangePicker({
  sensorId,
  range,
  live,
  window,
  onSelectRange,
  onApplyDates,
}: {
  sensorId: string;
  range: RangeKey;
  live: boolean;
  window: TimeWindow;
  onSelectRange: (range: RangeKey) => void;
  onApplyDates: (start: string, end: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [calRange, setCalRange] = useState<DateRange | undefined>();
  // The data-days lookup window, refreshed each time the popover opens so the
  // markers reflect "now", not the original mount time.
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Which days have readings (count > 0) over the last year — only while open,
  // and re-fetched from the network so newly-ingested days show up.
  const { data } = useQuery(SensorReadingsBucketedDocument, {
    variables: {
      sensorId,
      bucket: '1 day',
      start: new Date(nowMs - YEAR_MS).toISOString(),
      end: new Date(nowMs).toISOString(),
    },
    skip: !open,
    fetchPolicy: 'cache-and-network',
    context: { suppressErrorToast: true },
  });
  const dataDays = (data?.sensorReadingsBucketed ?? [])
    .filter((b) => b.count > 0)
    .map((b) => new Date(b.bucket));

  const handleSelect = (next: DateRange | undefined) => {
    setCalRange(next);
    if (next?.from && next?.to) {
      onApplyDates(toDateInput(next.from.getTime()), toDateInput(next.to.getTime()));
      setOpen(false);
    }
  };

  const triggerLabel = live
    ? RANGE_LABEL[range]
    : formatWindowLabel(window, 'day');

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setNowMs(Date.now());
          setCalRange(undefined);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <CalendarIcon className="size-3.5" />
          {triggerLabel}
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="flex flex-col gap-0.5 border-r border-border p-2">
            {RANGES.map((r) => (
              <Button
                key={r}
                variant={live && range === r ? 'secondary' : 'ghost'}
                size="sm"
                className="justify-start"
                onClick={() => {
                  onSelectRange(r);
                  setOpen(false);
                }}
              >
                {RANGE_LABEL[r]}
              </Button>
            ))}
          </div>
          <Calendar
            mode="range"
            captionLayout="dropdown"
            startMonth={new Date(2000, 0)}
            endMonth={new Date(nowMs)}
            defaultMonth={new Date(window.startMs)}
            selected={calRange}
            onSelect={handleSelect}
            numberOfMonths={2}
            autoFocus
            modifiers={{ hasData: dataDays }}
            modifiersClassNames={{
              hasData: cn(
                'relative after:pointer-events-none after:absolute',
                'after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2',
                'after:rounded-full after:bg-primary',
              ),
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
