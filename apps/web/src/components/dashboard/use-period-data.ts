import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import {
  buildPeriodRows,
  periodMsOf,
  periodSeriesMeta,
  periodWindow,
  type PeriodRow,
  type PeriodSeriesMeta,
} from '@/components/charts/period-series';
import { StatGroupSeriesDocument } from '@/graphql/widget-data.generated';
import { useDashboardTick } from './dashboard-live';
import type { CompareConfig } from './widget-config';

export interface PeriodData {
  rows: PeriodRow[];
  series: PeriodSeriesMeta[];
  loading: boolean;
}

/** One query over the full span, split into `count` periods re-based onto the
 * latest. The bucket-snapped window keeps Apollo on cache between bucket
 * boundaries (re-evaluated on the live tick). */
export function usePeriodData(cfg: CompareConfig): PeriodData {
  const tick = useDashboardTick();
  const periodMs = periodMsOf(cfg.amount, cfg.unit);

  const { start, end, bucket, nowAnchor } = useMemo(
    () => periodWindow(periodMs, cfg.count, Date.now()),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick drives refresh
    [periodMs, cfg.count, tick],
  );

  const { data, loading } = useQuery(StatGroupSeriesDocument, {
    variables: {
      groupId: cfg.groupId ?? '',
      type: cfg.typeKey ?? '',
      agg: cfg.agg,
      bucket,
      start,
      end,
    },
    skip: !cfg.groupId || !cfg.typeKey,
  });

  const rows = useMemo(
    () =>
      buildPeriodRows(
        data?.groupSeries?.[0]?.points ?? [],
        periodMs,
        cfg.count,
        nowAnchor,
      ),
    [data, periodMs, cfg.count, nowAnchor],
  );
  const series = useMemo(
    () => periodSeriesMeta(cfg.count, cfg.amount, cfg.unit),
    [cfg.count, cfg.amount, cfg.unit],
  );

  return { rows, series, loading };
}
