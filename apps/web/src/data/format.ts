/** Format a byte count as a value + binary unit (e.g. 128 → "128 B", 1.5 MB). */
export function formatBytes(bytes: number): { value: string; unit: string } {
  if (bytes < 1024) return { value: String(Math.round(bytes)), unit: 'B' };
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return { value: v >= 100 ? String(Math.round(v)) : v.toFixed(1), unit: units[i] };
}

/** Format a large count with a K/M suffix (e.g. 1_730_000 → "1.73" + "M"). */
export function formatCount(n: number): { value: string; unit: string } {
  if (n < 1000) return { value: String(Math.round(n)), unit: '' };
  if (n < 1_000_000) return { value: (n / 1000).toFixed(1), unit: 'K' };
  return { value: (n / 1_000_000).toFixed(2), unit: 'M' };
}
