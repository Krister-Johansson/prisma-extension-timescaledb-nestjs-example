import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toDateInput, type TimeWindow } from './chart-window';

/** Custom date-range picker (shadcn Calendar in a Popover). Seeds from the
 * current window each time it opens; applying a complete range sets a fixed
 * window via `onApply` (YYYY-MM-DD local dates, end inclusive). */
export function DetailDateRange({
  window,
  live,
  onApply,
}: {
  window: TimeWindow;
  live: boolean;
  onApply: (start: string, end: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();

  const handleSelect = (next: DateRange | undefined) => {
    setRange(next);
    if (next?.from && next?.to) {
      onApply(toDateInput(next.from.getTime()), toDateInput(next.to.getTime()));
      setOpen(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Start each open with an empty selection so it's a deliberate
        // from → to pick (seeding a full range makes a single click apply).
        if (next) setRange(undefined);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <CalendarIcon className="size-3.5" />
          {live ? 'Custom range' : 'Edit range'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={new Date(window.startMs)}
          selected={range}
          onSelect={handleSelect}
          numberOfMonths={2}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
