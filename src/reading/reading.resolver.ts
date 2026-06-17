import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { SensorReading } from '../sensor/models/sensor.model';
import { IngestReadingInput } from './dto/ingest-reading.input';
import {
  HourlyArgs,
  ReadingBucketArgs,
  RefreshHourlyArgs,
} from './dto/reading-query.args';
import { ReadingBucket } from './models/reading-bucket.model';
import { SensorReadingHourly } from './models/sensor-reading-hourly.model';
import { ReadingService } from './reading.service';

@Resolver()
export class ReadingResolver {
  constructor(private readonly readingService: ReadingService) {}

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

  /** Pre-aggregated rows from the continuous aggregate. */
  @Query(() => [SensorReadingHourly], { name: 'sensorReadingsHourly' })
  hourly(@Args() args: HourlyArgs): Promise<SensorReadingHourly[]> {
    return this.readingService.hourly(args);
  }

  @Mutation(() => Boolean, { name: 'refreshSensorReadingHourly' })
  refreshHourly(@Args() args: RefreshHourlyArgs): Promise<boolean> {
    return this.readingService.refreshHourly(args);
  }
}
