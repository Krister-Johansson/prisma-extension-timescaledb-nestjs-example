import { bucketFor } from '@/components/dashboard/widget-config';
import { SERIES_COLORS } from '@/data/aggregates';

/** Fixed-length period units (calendar units come in a later pass). */
export const PERIOD_UNIT_MS = { day: 86_400_000, week: 604_800_000 } as const;
export type PeriodUnit = keyof typeof PERIOD_UNIT_MS;
export const PERIOD_UNIT_LABEL: Record<PeriodUnit, string> = {
  day: 'Days',
  week: 'Weeks',
};
/** Cap to the palette so two periods never share a colour. */
export const MAX_PERIODS = SERIES_COLORS.length;

export const periodMsOf = (amount: number, unit: PeriodUnit) =>
  amount * PERIOD_UNIT_MS[unit];

export interface PeriodRow {
  t: number;
  [key: string]: number | null;
}
export interface PeriodSeriesMeta {
  key: string;
  label: string;
  color: string;
}

/** The bucket-snapped query window covering `count` periods back from now. The
 * end snaps UP so the in-progress period is included and variables stay stable
 * within a bucket. */
export function periodWindow(periodMs: number, count: number, nowMs: number) {
  const bucket = bucketFor(periodMs);
  const nowAnchor = Math.ceil(nowMs / bucket.ms) * bucket.ms;
  return {
    bucket: bucket.interval,
    start: new Date(nowAnchor - periodMs * count).toISOString(),
    end: new Date(nowAnchor).toISOString(),
    nowAnchor,
  };
}

/** Split one continuous series into `count` equal periods, each re-based onto
 * the latest period's timeline so they overlay. Bucket timestamps are period
 * *starts*, so the `-1` keeps a boundary point in the newer period. */
export function buildPeriodRows(
  points: { bucket: string; value: number | null }[],
  periodMs: number,
  count: number,
  nowAnchor: number,
): PeriodRow[] {
  const byTime = new Map<number, PeriodRow>();
  for (const p of points) {
    if (p.value == null) continue;
    const bt = new Date(p.bucket).getTime();
    const periodsAgo = Math.floor((nowAnchor - 1 - bt) / periodMs);
    if (periodsAgo < 0 || periodsAgo >= count) continue;
    const rebased = bt + periodsAgo * periodMs;
    let row = byTime.get(rebased);
    if (!row) {
      row = { t: rebased };
      byTime.set(rebased, row);
    }
    row[`p${periodsAgo}`] = p.value;
  }
  return [...byTime.values()].sort((a, b) => a.t - b.t);
}

export function periodSeriesMeta(
  count: number,
  amount: number,
  unit: PeriodUnit,
): PeriodSeriesMeta[] {
  return Array.from({ length: count }, (_, k) => {
    const ago = k * amount;
    return {
      key: `p${k}`,
      label: k === 0 ? 'Latest' : `${ago} ${unit}${ago > 1 ? 's' : ''} ago`,
      color: SERIES_COLORS[k % SERIES_COLORS.length],
    };
  });
}

// ---- range-array model -----------------------------------------------------
// The general primitive: a list of explicit { start, end } ranges. Every mode
// (rolling / season / custom) is just a generator that fills this array; the
// engine overlays the ranges re-based onto the first one's timeline (aligned by
// offset from each range's start). See GA "compare date ranges" / Grafana shift.

export interface DateRange {
  start: number; // ms
  end: number; // ms (exclusive)
  label: string;
}

/** "Last N periods" → N contiguous equal ranges ending at `nowAnchor`. */
export function rollingRanges(
  amount: number,
  unit: PeriodUnit,
  count: number,
  nowMs: number,
): DateRange[] {
  const periodMs = periodMsOf(amount, unit);
  const bucket = bucketFor(periodMs);
  const nowAnchor = Math.ceil(nowMs / bucket.ms) * bucket.ms;
  return Array.from({ length: count }, (_, k) => {
    const ago = k * amount;
    return {
      start: nowAnchor - (k + 1) * periodMs,
      end: nowAnchor - k * periodMs,
      label: k === 0 ? 'Latest' : `${ago} ${unit}${ago > 1 ? 's' : ''} ago`,
    };
  });
}

/** "Same calendar window across years" (e.g. Jun 1 – Aug 31 for 2023/24/25). */
export function seasonRanges(
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
  years: number[],
): DateRange[] {
  return years
    .slice()
    .sort((a, b) => b - a)
    .map((y) => ({
      start: Date.UTC(y, startMonth - 1, startDay),
      // +1 day so the end day is inclusive.
      end: Date.UTC(y, endMonth - 1, endDay) + PERIOD_UNIT_MS.day,
      label: String(y),
    }));
}

/** The union span + a bucket sized for the median range — for the single query. */
export function rangesQuery(ranges: DateRange[]) {
  const span = ranges.reduce(
    (acc, r) => ({
      start: Math.min(acc.start, r.start),
      end: Math.max(acc.end, r.end),
    }),
    { start: Infinity, end: -Infinity },
  );
  const lens = ranges.map((r) => r.end - r.start).sort((a, b) => a - b);
  const median = lens[Math.floor(lens.length / 2)] ?? PERIOD_UNIT_MS.day;
  return {
    start: new Date(span.start).toISOString(),
    end: new Date(span.end).toISOString(),
    bucket: bucketFor(median).interval,
  };
}

/** Overlay the ranges: each point re-based by its offset from its own range's
 * start, onto the first range's timeline (drops points outside every range). */
export function buildRangeRows(
  points: { bucket: string; value: number | null }[],
  ranges: DateRange[],
): PeriodRow[] {
  const base = ranges[0]?.start ?? 0;
  const byTime = new Map<number, PeriodRow>();
  for (const p of points) {
    if (p.value == null) continue;
    const bt = new Date(p.bucket).getTime();
    const k = ranges.findIndex((r) => bt >= r.start && bt < r.end);
    if (k < 0) continue;
    const rebased = base + (bt - ranges[k].start);
    let row = byTime.get(rebased);
    if (!row) {
      row = { t: rebased };
      byTime.set(rebased, row);
    }
    row[`p${k}`] = p.value;
  }
  return [...byTime.values()].sort((a, b) => a.t - b.t);
}

export function rangeSeriesMeta(ranges: DateRange[]): PeriodSeriesMeta[] {
  return ranges.map((r, k) => ({
    key: `p${k}`,
    label: r.label,
    color: SERIES_COLORS[k % SERIES_COLORS.length],
  }));
}
