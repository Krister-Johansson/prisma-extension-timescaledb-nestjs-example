import { formatBytes } from '@/data/format';

export interface StorageRow {
  label: string;
  bytes: number;
}

/** Bars of the hypertable's storage by component (table data / indexes / TOAST),
 * each sized as its share of the total. */
export function SystemStorage({ rows }: { rows: StorageRow[] }) {
  const total = rows.reduce((sum, r) => sum + Math.max(0, r.bytes), 0);

  return (
    <div className="rounded-[14px] border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 text-sm font-semibold">Storage breakdown</div>
      <div className="flex flex-col gap-4">
        {rows.map((row) => {
          const { value, unit } = formatBytes(row.bytes);
          const pct = total > 0 ? Math.round((row.bytes / total) * 100) : 0;
          return (
            <div key={row.label}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[12.5px] font-medium">{row.label}</span>
                <span className="font-mono text-[12.5px] font-semibold">
                  {value} {unit}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-md bg-surface-2">
                <div
                  className="h-full rounded-md bg-primary"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
