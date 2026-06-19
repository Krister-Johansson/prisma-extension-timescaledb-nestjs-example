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
