export interface SystemStat {
  label: string;
  value: string;
  unit: string;
  sub: string;
}

export function SystemStatCards({ stats }: { stats: SystemStat[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-[14px] border border-border bg-card p-[18px] shadow-sm"
        >
          <div className="font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground">
            {stat.label}
          </div>
          <div className="mt-3 flex items-end gap-1.5">
            <span className="font-mono text-3xl font-semibold leading-none tracking-tight">
              {stat.value}
            </span>
            <span className="mb-1 text-[13px] text-muted-foreground">
              {stat.unit}
            </span>
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground">{stat.sub}</div>
        </div>
      ))}
    </div>
  );
}
