import { CHUNKS, COMPRESSION } from '@/data/system';
import { SystemGauge } from './system-gauge';
import { SystemStatCards } from './system-stat-cards';
import { SystemStorage } from './system-storage';

const gaugeCard =
  'flex flex-col items-center rounded-[14px] border border-border bg-card p-5 shadow-sm';

export function System() {
  const chunkPct = CHUNKS.total
    ? Math.min(1, Math.max(0, CHUNKS.compressed / CHUNKS.total))
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <SystemStatCards />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.3fr]">
        <div className={gaugeCard}>
          <div className="self-start text-sm font-semibold">
            Compression ratio
          </div>
          <SystemGauge
            percent={COMPRESSION.savedPct}
            value={COMPRESSION.ratio}
            caption="compression"
            color="var(--primary)"
          />
          <div className="text-xs text-muted-foreground">{COMPRESSION.sub}</div>
        </div>

        <div className={gaugeCard}>
          <div className="self-start text-sm font-semibold">
            Chunks compressed
          </div>
          <SystemGauge
            percent={chunkPct}
            value={`${Math.round(chunkPct * 100)}%`}
            caption="of total"
            color="var(--ok)"
          />
          <div className="text-xs text-muted-foreground">
            {CHUNKS.compressed} / {CHUNKS.total} chunks
          </div>
        </div>

        <SystemStorage />
      </div>
    </div>
  );
}
