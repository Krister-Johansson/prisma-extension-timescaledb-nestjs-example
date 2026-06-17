import { storageWithPct } from '@/data/system';

export function SystemStorage() {
  const rows = storageWithPct();
  return (
    <div className="rounded-[14px] border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 text-sm font-semibold">Storage by sensor type</div>
      <div className="flex flex-col gap-4">
        {rows.map((row) => (
          <div key={row.type}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[12.5px] font-medium">{row.type}</span>
              <span className="font-mono text-[12.5px] font-semibold">
                {row.gb} GB
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-md bg-surface-2">
              <div
                className="h-full rounded-md bg-primary"
                style={{ width: `${row.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
