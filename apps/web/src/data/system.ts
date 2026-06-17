// Static demo metrics, shaped like the values prisma-extension-timescaledb's
// introspection exposes (hypertable size, compression stats, chunk counts).
export interface SystemStat {
  label: string;
  value: string;
  unit: string;
  sub: string;
}

export const SYSTEM_STATS: SystemStat[] = [
  { label: 'TOTAL READINGS', value: '1.73', unit: 'M', sub: 'across all hypertable chunks' },
  { label: 'INGEST RATE', value: '72', unit: '/min', sub: '6 sensors · 1 per 5 min' },
  { label: 'HYPERTABLE SIZE', value: '128', unit: 'MB', sub: 'raw + indexes' },
  { label: 'RETENTION', value: '90', unit: 'days', sub: 'auto-drop policy' },
];

export const COMPRESSION = {
  ratio: '4.2×',
  savedPct: 0.76,
  sub: '76% space saved (columnstore)',
};

export const CHUNKS = {
  compressed: 18,
  total: 24,
};

export interface StorageRow {
  type: string;
  gb: number;
}

export const STORAGE_BY_TYPE: StorageRow[] = [
  { type: 'TEMPERATURE', gb: 0.62 },
  { type: 'PRESSURE', gb: 0.41 },
  { type: 'HUMIDITY', gb: 0.28 },
];

/** Bar width per row, scaled so the largest type fills the track. */
export function storageWithPct(rows: StorageRow[] = STORAGE_BY_TYPE) {
  const max = Math.max(...rows.map((r) => r.gb), 0);
  return rows.map((r) => ({
    ...r,
    pct: max > 0 ? Math.round((r.gb / max) * 100) : 0,
  }));
}
