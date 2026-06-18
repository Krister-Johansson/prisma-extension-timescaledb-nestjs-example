import { useQuery } from '@apollo/client/react';
import { QueryError } from '@/components/common/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBytes, formatCount } from '@/data/format';
import { HypertableStatsDocument } from '@/graphql/system.generated';
import { SystemGauge } from './system-gauge';
import { type SystemStat, SystemStatCards } from './system-stat-cards';
import { SystemStorage } from './system-storage';

const gaugeCard =
  'flex flex-col items-center rounded-[14px] border border-border bg-card p-5 shadow-sm';

export function System() {
  const { data, loading, error } = useQuery(HypertableStatsDocument, {
    variables: { model: 'SensorReading' },
    pollInterval: 15_000,
    context: { suppressErrorToast: true },
  });

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-[14px]" />
          ))}
        </div>
        <Skeleton className="h-[220px] rounded-[14px]" />
      </div>
    );
  }
  if (error || !data) return <QueryError message={error?.message} />;

  const s = data.hypertableStats;
  const rows = formatCount(s.approximateRowCount);
  const size = formatBytes(s.totalBytes);
  const index = formatBytes(s.indexBytes);

  const stats: SystemStat[] = [
    { label: 'TOTAL READINGS', value: rows.value, unit: rows.unit, sub: 'across all chunks' },
    { label: 'HYPERTABLE SIZE', value: size.value, unit: size.unit, sub: 'table + indexes + toast' },
    { label: 'INDEX SIZE', value: index.value, unit: index.unit, sub: 'on (sensorId, time)' },
    {
      label: 'CHUNKS',
      value: String(s.totalChunks),
      unit: '',
      sub: `${s.compressedChunks} compressed`,
    },
  ];

  const before = s.beforeCompressionBytes;
  const after = s.afterCompressionBytes;
  const compressed = before != null && after != null && after > 0;
  const ratio = compressed ? before / after : null;
  const savedPct = compressed ? Math.max(0, 1 - after / before) : 0;
  const chunkPct = s.totalChunks ? s.compressedChunks / s.totalChunks : 0;

  return (
    <div className="flex flex-col gap-4">
      <SystemStatCards stats={stats} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.3fr]">
        <div className={gaugeCard}>
          <div className="self-start text-sm font-semibold">
            Compression ratio
          </div>
          <SystemGauge
            percent={savedPct}
            value={ratio ? `${ratio.toFixed(1)}×` : '—'}
            caption="saved"
            color="var(--primary)"
          />
          <div className="text-xs text-muted-foreground">
            {compressed
              ? `${Math.round(savedPct * 100)}% space saved (columnstore)`
              : 'no compressed chunks yet (compresses after 7 days)'}
          </div>
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
            {s.compressedChunks} / {s.totalChunks} chunks
          </div>
        </div>

        <SystemStorage
          rows={[
            { label: 'Table data', bytes: s.tableBytes },
            { label: 'Indexes', bytes: s.indexBytes },
            { label: 'TOAST', bytes: s.toastBytes },
          ]}
        />
      </div>
    </div>
  );
}
