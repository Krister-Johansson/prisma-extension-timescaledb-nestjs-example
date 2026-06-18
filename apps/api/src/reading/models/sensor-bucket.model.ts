import {
  Field,
  Float,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
} from '@nestjs/graphql';

/** One `time_bucket` row for a specific sensor — the multi-sensor variant of
 * {@link ReadingBucket}, used to compare several sensors on one chart. */
@ObjectType()
export class SensorBucket {
  @Field(() => ID)
  sensorId!: string;

  @Field(() => GraphQLISODateTime)
  bucket!: Date;

  @Field(() => Float, { nullable: true })
  avg!: number | null;

  @Field(() => Float, { nullable: true })
  min!: number | null;

  @Field(() => Float, { nullable: true })
  max!: number | null;

  @Field(() => Int)
  count!: number;
}
