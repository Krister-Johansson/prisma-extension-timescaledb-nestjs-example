import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { z } from 'zod';
import { AlertService } from '../../alert/alert.service';
import { INTERVAL_PATTERN } from '../../common/interval';
import { SeriesAgg } from '../../reading/models/group-series.model';
import { ReadingService } from '../../reading/reading.service';
import { HypertableModel } from '../../timescale-admin/models/hypertable-stats.model';
import { TimescaleAdminService } from '../../timescale-admin/timescale-admin.service';
import { jsonResult } from '../mcp-result';

const bucket = z
  .string()
  .regex(INTERVAL_PATTERN, 'an interval like "1 hour" or "30 minutes"');
const iso = z.string().datetime();

/** Read-only MCP tools mirroring the frontend's data + analytics views. There is
 * no ingestion tool — the MCP never writes time-series data. */
@Injectable()
export class DataTools {
  constructor(
    private readonly readings: ReadingService,
    private readonly alerts: AlertService,
    private readonly admin: TimescaleAdminService,
  ) {}

  @Tool({
    name: 'readings_bucketed',
    description:
      'time_bucket rollup (avg/min/max/count) for one sensor over [start, end).',
    parameters: z.object({
      sensorId: z.string(),
      bucket,
      start: iso,
      end: iso,
    }),
    annotations: { readOnlyHint: true },
  })
  async bucketed({
    sensorId,
    bucket,
    start,
    end,
  }: {
    sensorId: string;
    bucket: string;
    start: string;
    end: string;
  }) {
    return jsonResult(
      await this.readings.bucketed({
        sensorId,
        bucket,
        start: new Date(start),
        end: new Date(end),
      }),
    );
  }

  @Tool({
    name: 'readings_bucketed_multi',
    description:
      'Same rollup for several sensors at once (grouped by sensor) — for cross-sensor compares.',
    parameters: z.object({
      sensorIds: z.array(z.string()).min(1).max(100),
      bucket,
      start: iso,
      end: iso,
    }),
    annotations: { readOnlyHint: true },
  })
  async bucketedMulti({
    sensorIds,
    bucket,
    start,
    end,
  }: {
    sensorIds: string[];
    bucket: string;
    start: string;
    end: string;
  }) {
    return jsonResult(
      await this.readings.bucketedMulti({
        sensorIds,
        bucket,
        start: new Date(start),
        end: new Date(end),
      }),
    );
  }

  @Tool({
    name: 'group_series',
    description:
      'Aggregate overlay series — one per spec {groupId, type?, agg} across a group subtree, bucketed.',
    parameters: z.object({
      specs: z
        .array(
          z.object({
            groupId: z.string(),
            type: z
              .string()
              .regex(/^[A-Z0-9_]+$/)
              .optional(),
            agg: z.enum(['AVG', 'MIN', 'MAX']).default('AVG'),
          }),
        )
        .min(1)
        .max(12),
      bucket,
      start: iso,
      end: iso,
    }),
    annotations: { readOnlyHint: true },
  })
  async groupSeries({
    specs,
    bucket,
    start,
    end,
  }: {
    specs: { groupId: string; type?: string; agg: 'AVG' | 'MIN' | 'MAX' }[];
    bucket: string;
    start: string;
    end: string;
  }) {
    return jsonResult(
      await this.readings.groupSeries({
        // Zod gives string-literal aggs; the service DTO uses the SeriesAgg enum
        // (same values), so map them across.
        specs: specs.map((s) => ({
          groupId: s.groupId,
          type: s.type,
          agg: s.agg as SeriesAgg,
        })),
        bucket,
        start: new Date(start),
        end: new Date(end),
      }),
    );
  }

  @Tool({
    name: 'readings_hourly',
    description:
      'Pre-aggregated hourly rows from the continuous aggregate (optionally filtered by sensor / time).',
    parameters: z.object({
      sensorId: z.string().optional(),
      start: iso.optional(),
      end: iso.optional(),
    }),
    annotations: { readOnlyHint: true },
  })
  async hourly({
    sensorId,
    start,
    end,
  }: {
    sensorId?: string;
    start?: string;
    end?: string;
  }) {
    return jsonResult(
      await this.readings.hourly({
        sensorId,
        start: start ? new Date(start) : undefined,
        end: end ? new Date(end) : undefined,
      }),
    );
  }

  @Tool({
    name: 'alert_events',
    description:
      'Recent alert events (RAISED/CLEARED), newest first — all sensors or one. take is capped at 200.',
    parameters: z.object({
      sensorId: z.string().optional(),
      take: z.number().int().min(1).max(200).default(50),
    }),
    annotations: { readOnlyHint: true },
  })
  async events({ sensorId, take }: { sensorId?: string; take: number }) {
    return jsonResult(await this.alerts.events(sensorId, take));
  }

  @Tool({
    name: 'hypertable_stats',
    description:
      'TimescaleDB introspection for the readings hypertable: chunks, compression and size.',
    parameters: z.object({
      model: z.enum(['SensorReading']).default('SensorReading'),
    }),
    annotations: { readOnlyHint: true },
  })
  async stats({ model }: { model: 'SensorReading' }) {
    return jsonResult(
      await this.admin.hypertableStats(model as HypertableModel),
    );
  }
}
