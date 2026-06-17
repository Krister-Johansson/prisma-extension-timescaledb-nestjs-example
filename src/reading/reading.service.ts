import { Inject, Injectable } from '@nestjs/common';
import { assertInterval } from 'prisma-extension-timescaledb';
import { AlertService } from '../alert/alert.service';
import { PRISMA_CLIENT } from '../prisma/prisma-client';
import type { ExtendedPrismaClient } from '../prisma/prisma-client';
import { IngestReadingInput } from './dto/ingest-reading.input';
import {
  HourlyArgs,
  ReadingBucketArgs,
  RefreshHourlyArgs,
} from './dto/reading-query.args';
import { ReadingBucket } from './models/reading-bucket.model';
import { SensorReadingHourly } from './models/sensor-reading-hourly.model';

@Injectable()
export class ReadingService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient,
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
    await this.alertService.evaluateReading(input.sensorId, input.value);
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
