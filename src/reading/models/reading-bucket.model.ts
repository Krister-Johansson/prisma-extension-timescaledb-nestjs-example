import {
  Field,
  Float,
  GraphQLISODateTime,
  Int,
  ObjectType,
} from '@nestjs/graphql';

/** One `time_bucket` row: a time window with aggregates over its readings. */
@ObjectType()
export class ReadingBucket {
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
