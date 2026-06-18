import { Inject, Injectable, Logger } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { assertInterval } from 'prisma-extension-timescaledb';
import { AlertService } from '../alert/alert.service';
import { Prisma } from '../generated/prisma/client.js';
import { SensorBucket } from './models/sensor-bucket.model';
import { PRISMA_CLIENT } from '../prisma/prisma-client';
import type { ExtendedPrismaClient } from '../prisma/prisma-client';
import { PUB_SUB, TOPICS } from '../pubsub/pubsub.module';
import { GroupSeriesArgs } from './dto/group-series.args';
import { IngestReadingInput } from './dto/ingest-reading.input';
import {
  HourlyArgs,
  ReadingBucketArgs,
  ReadingBucketMultiArgs,
  RefreshHourlyArgs,
} from './dto/reading-query.args';
import {
  GroupSeries,
  GroupSeriesPoint,
  SeriesAgg,
} from './models/group-series.model';
import { ReadingBucket } from './models/reading-bucket.model';
import { SensorReadingHourly } from './models/sensor-reading-hourly.model';

const AGG_FN: Record<SeriesAgg, string> = {
  [SeriesAgg.AVG]: 'avg',
  [SeriesAgg.MIN]: 'min',
  [SeriesAgg.MAX]: 'max',
};

@Injectable()
export class ReadingService {
  private readonly logger = new Logger(ReadingService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
    private readonly alertService: AlertService,
  ) {}

  /** Write a raw reading into the hypertable, then evaluate the sensor's alert. */
  async ingest(input: IngestReadingInput) {
    const reading = await this.prisma.sensorReading.create({
      data: {
        sensorId: input.sensorId,
        value: input.value,
        time: input.time ?? new Date(),
      },
    });

    // Both the publish and the alert evaluation are best-effort: the reading is
    // already persisted, so a failure here must not fail the ingest (a client
    // retry would duplicate the row).
    try {
      await this.pubSub.publish(TOPICS.readingIngested, {
        readingIngested: reading,
      });
    } catch (error) {
      this.logger.error(
        `Subscription publish failed for sensor ${input.sensorId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    try {
      await this.alertService.evaluateReading(input.sensorId, input.value);
    } catch (error) {
      this.logger.error(
        `Alert evaluation failed for sensor ${input.sensorId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return reading;
  }

  /** Ad-hoc time_bucket rollup over the raw hypertable. */
  async bucketed(args: ReadingBucketArgs): Promise<ReadingBucket[]> {
    const { bucket } = args;
    assertInterval(bucket); // narrows string -> Interval (already format-validated)

    return this.prisma.sensorReading.timeBucket({
      bucket,
      range: { start: args.start, end: args.end },
      where: { sensorId: args.sensorId },
      aggregate: {
        avg: { avg: 'value' },
        min: { min: 'value' },
        max: { max: 'value' },
        count: { count: 'value', as: 'number' },
      },
    });
  }

  /** Ad-hoc time_bucket rollup for several sensors at once (one query, grouped
   * by sensor) — for comparing sensors on a single chart. */
  async bucketedMulti(args: ReadingBucketMultiArgs): Promise<SensorBucket[]> {
    const { bucket, sensorIds, start, end } = args;
    if (sensorIds.length === 0) return [];
    assertInterval(bucket); // format already validated by the DTO

    return this.prisma.$queryRaw<SensorBucket[]>`
      SELECT time_bucket(${bucket}::interval, "time") AS bucket,
             "sensorId",
             avg(value)::float8 AS avg,
             min(value)::float8 AS min,
             max(value)::float8 AS max,
             count(*)::int AS count
      FROM "SensorReading"
      WHERE "sensorId" IN (${Prisma.join(sensorIds)})
        AND "time" >= ${start} AND "time" < ${end}
      GROUP BY bucket, "sensorId"
      ORDER BY bucket ASC
    `;
  }

  /** Overlay series: for each spec, the chosen aggregate across all sensors in a
   * group's subtree (optionally one type), bucketed over time. */
  async groupSeries(args: GroupSeriesArgs): Promise<GroupSeries[]> {
    const { specs, bucket, start, end } = args;
    assertInterval(bucket);

    return Promise.all(
      specs.map(async (spec) => {
        const fn = AGG_FN[spec.agg]; // whitelisted -> safe with Prisma.raw
        const typeFilter = spec.type
          ? Prisma.sql`AND s."typeKey" = ${spec.type}`
          : Prisma.empty;

        const points = await this.prisma.$queryRaw<GroupSeriesPoint[]>`
          WITH RECURSIVE sub AS (
            SELECT id FROM "SensorGroup" WHERE id = ${spec.groupId}
            UNION
            SELECT g.id FROM "SensorGroup" g JOIN sub ON g."parentId" = sub.id
          )
          SELECT time_bucket(${bucket}::interval, r."time") AS bucket,
                 ${Prisma.raw(fn)}(r.value)::float8 AS value
          FROM "SensorReading" r
          JOIN "Sensor" s ON s.id = r."sensorId"
          WHERE s."groupId" IN (SELECT id FROM sub)
            ${typeFilter}
            AND r."time" >= ${start} AND r."time" < ${end}
          GROUP BY bucket
          ORDER BY bucket ASC
        `;

        return {
          groupId: spec.groupId,
          type: spec.type ?? null,
          agg: spec.agg,
          points,
        };
      }),
    );
  }

  /** Single aggregate (avg/min/max/count) across a group's subtree (optionally
   * one type) over a window — for "what was the average temp last night". */
  async aggregateForGroup(
    groupId: string,
    type: string | undefined,
    start: Date,
    end: Date,
  ): Promise<{
    avg: number | null;
    min: number | null;
    max: number | null;
    count: number;
  }> {
    const typeFilter = type
      ? Prisma.sql`AND s."typeKey" = ${type}`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<
      {
        avg: number | null;
        min: number | null;
        max: number | null;
        count: bigint;
      }[]
    >`
      WITH RECURSIVE sub AS (
        SELECT id FROM "SensorGroup" WHERE id = ${groupId}
        UNION
        SELECT g.id FROM "SensorGroup" g JOIN sub ON g."parentId" = sub.id
      )
      SELECT avg(r.value)::float8 AS avg, min(r.value)::float8 AS min,
             max(r.value)::float8 AS max, count(*)::bigint AS count
      FROM "SensorReading" r
      JOIN "Sensor" s ON s.id = r."sensorId"
      WHERE s."groupId" IN (SELECT id FROM sub)
        ${typeFilter}
        AND r."time" >= ${start} AND r."time" < ${end}
    `;
    const r = rows[0];
    return { avg: r.avg, min: r.min, max: r.max, count: Number(r.count) };
  }

  /** Newest reading per sensor (or none) — for "what's the temperature now". */
  async latestForSensors(
    sensorIds: string[],
  ): Promise<{ sensorId: string; time: Date; value: number }[]> {
    if (sensorIds.length === 0) return [];
    return this.prisma.$queryRaw`
      SELECT "sensorId", time, value FROM (
        SELECT "sensorId", time, value,
               ROW_NUMBER() OVER (PARTITION BY "sensorId" ORDER BY time DESC) AS rn
        FROM "SensorReading"
        WHERE "sensorId" IN (${Prisma.join(sensorIds)})
      ) ranked WHERE rn = 1
    `;
  }

  /** Read pre-aggregated rows from the continuous aggregate (export layer). */
  async hourly(args: HourlyArgs): Promise<SensorReadingHourly[]> {
    const rows = await this.prisma.sensorReadingHourly.findMany({
      where: {
        sensorId: args.sensorId,
        bucket:
          args.start || args.end
            ? { gte: args.start ?? undefined, lte: args.end ?? undefined }
            : undefined,
      },
      orderBy: { bucket: 'desc' },
    });
    // count() is BIGINT in the view; expose it as a GraphQL Int.
    return rows.map((row) => ({ ...row, samples: Number(row.samples) }));
  }

  /** Materialize the continuous aggregate for an optional window. */
  async refreshHourly(args: RefreshHourlyArgs): Promise<boolean> {
    await this.prisma.$timescale.refreshContinuousAggregate(
      'SensorReadingHourly',
      { start: args.start ?? null, end: args.end ?? null },
    );
    return true;
  }
}
