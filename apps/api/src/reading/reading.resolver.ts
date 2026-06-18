import { Inject } from '@nestjs/common';
import {
  Args,
  ID,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB, TOPICS } from '../pubsub/pubsub.module';
import { SensorReading } from '../sensor/models/sensor.model';
import { IngestReadingInput } from './dto/ingest-reading.input';
import {
  HourlyArgs,
  ReadingBucketArgs,
  ReadingBucketMultiArgs,
  RefreshHourlyArgs,
} from './dto/reading-query.args';
import { ReadingBucket } from './models/reading-bucket.model';
import { SensorBucket } from './models/sensor-bucket.model';
import { SensorReadingHourly } from './models/sensor-reading-hourly.model';
import { ReadingService } from './reading.service';

@Resolver()
export class ReadingResolver {
  constructor(
    private readonly readingService: ReadingService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Mutation(() => SensorReading)
  ingestReading(
    @Args('input') input: IngestReadingInput,
  ): Promise<SensorReading> {
    return this.readingService.ingest(input);
  }

  /** Ad-hoc rollup over the raw hypertable via timeBucket(...). */
  @Query(() => [ReadingBucket], { name: 'sensorReadingsBucketed' })
  bucketed(@Args() args: ReadingBucketArgs): Promise<ReadingBucket[]> {
    return this.readingService.bucketed(args);
  }

  /** Same rollup for several sensors at once (grouped by sensor) — for the
   * cross-sensor compare chart. */
  @Query(() => [SensorBucket], { name: 'sensorReadingsBucketedMulti' })
  bucketedMulti(@Args() args: ReadingBucketMultiArgs): Promise<SensorBucket[]> {
    return this.readingService.bucketedMulti(args);
  }

  /** Pre-aggregated rows from the continuous aggregate. */
  @Query(() => [SensorReadingHourly], { name: 'sensorReadingsHourly' })
  hourly(@Args() args: HourlyArgs): Promise<SensorReadingHourly[]> {
    return this.readingService.hourly(args);
  }

  @Mutation(() => Boolean, { name: 'refreshSensorReadingHourly' })
  refreshHourly(@Args() args: RefreshHourlyArgs): Promise<boolean> {
    return this.readingService.refreshHourly(args);
  }

  /** Live stream of ingested readings, optionally filtered by sensor. */
  @Subscription(() => SensorReading, {
    filter: (
      payload: { readingIngested: SensorReading },
      variables: { sensorId?: string },
    ) =>
      !variables.sensorId ||
      payload.readingIngested.sensorId === variables.sensorId,
  })
  readingIngested(
    @Args('sensorId', { type: () => ID, nullable: true }) _sensorId?: string,
  ) {
    return this.pubSub.asyncIterableIterator(TOPICS.readingIngested);
  }
}
