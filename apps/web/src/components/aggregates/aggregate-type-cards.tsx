import type { TypeAverage } from '@/data/sensors';

export function AggregateTypeCards({ types }: { types: TypeAverage[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {types.map((t) => (
        <div
          key={t.type}
          className="rounded-[14px] border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground">
              {t.type}
            </div>
            <div className="font-mono text-[11px] text-muted-2">
              {t.count} sensors
            </div>
          </div>
          <div className="mt-3.5 flex items-end gap-1.5">
            <span className="font-mono text-3xl font-semibold leading-none tracking-tight">
              {t.avg}
            </span>
            <span className="mb-1 text-[13px] text-muted-foreground">
              {t.unit} avg
            </span>
          </div>
          <div className="mt-3.5 flex gap-5 border-t border-border pt-3">
            <div>
              <div className="font-mono text-[10px] tracking-wide text-muted-2">
                MIN
              </div>
              <div className="mt-1 font-mono text-sm font-semibold">{t.min}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] tracking-wide text-muted-2">
                MAX
              </div>
              <div className="mt-1 font-mono text-sm font-semibold">{t.max}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
