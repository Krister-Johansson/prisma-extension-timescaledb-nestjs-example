import { BUCKET_MS, RANGE_MS, type RangeKey, type Resolution } from './chart-params';

export interface TimeWindow {
  startMs: number;
  endMs: number;
}

/**
 * Resolve the visible window from the URL params. A valid `from`+`to` pair is a
 * fixed (non-live) window; otherwise it's the live `[now - range, now]`, with
 * the end snapped up to a bucket boundary so query vars stay stable.
 */
export function resolveWindow(opts: {
  res: Resolution;
  range: RangeKey;
  from?: string;
  to?: string;
  now: number;
}): { window: TimeWindow; live: boolean } {
  const { res, range, from, to, now } = opts;

  if (from && to) {
    const startMs = Date.parse(from);
    const endMs = Date.parse(to);
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
      return { window: { startMs, endMs }, live: false };
    }
  }

  const bucketMs = BUCKET_MS[res];
  const endMs = Math.ceil(now / bucketMs) * bucketMs;
  return { window: { startMs: endMs - RANGE_MS[range], endMs }, live: true };
}

/** Slide a window by its own span (negative = earlier, positive = later). */
export function shiftWindow(w: TimeWindow, dir: -1 | 1): TimeWindow {
  const span = w.endMs - w.startMs;
  return { startMs: w.startMs + dir * span, endMs: w.endMs + dir * span };
}

/** Build a window from two `YYYY-MM-DD` inputs (local), end-date inclusive. */
export function datesToWindow(
  startDate: string,
  endDate: string,
): TimeWindow | null {
  const startMs = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`);
  end.setDate(end.getDate() + 1); // include the whole end day
  const endMs = end.getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return null;
  }
  return { startMs, endMs };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** A millisecond instant as a local `YYYY-MM-DD` (for <input type="date">). */
export function toDateInput(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Human label for a window, with time shown only for sub-day resolutions. */
export function formatWindowLabel(w: TimeWindow, res: Resolution): string {
  const withTime = res === 'minute' || res === 'hour';
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { month: 'short', day: 'numeric' };
  const fmt = (ms: number) => new Date(ms).toLocaleString([], opts);
  return `${fmt(w.startMs)} — ${fmt(w.endMs)}`;
}
