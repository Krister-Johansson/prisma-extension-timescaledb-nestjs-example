import {
  Field,
  Float,
  GraphQLISODateTime,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';

/** Which aggregate to compute across the matching sensors per bucket. */
export enum SeriesAgg {
  AVG = 'AVG',
  MIN = 'MIN',
  MAX = 'MAX',
}
registerEnumType(SeriesAgg, { name: 'SeriesAgg' });

@ObjectType()
export class GroupSeriesPoint {
  @Field(() => GraphQLISODateTime)
  bucket!: Date;

  @Field(() => Float, { nullable: true })
  value!: number | null;
}

/** One overlay series: the chosen aggregate over all sensors in a group's
 * subtree (optionally filtered to a sensor type), bucketed over time. */
@ObjectType()
export class GroupSeries {
  @Field(() => ID)
  groupId!: string;

  /** Measurement type key the series was filtered to, or null for all types. */
  @Field(() => String, { nullable: true })
  type!: string | null;

  @Field(() => SeriesAgg)
  agg!: SeriesAgg;

  @Field(() => [GroupSeriesPoint])
  points!: GroupSeriesPoint[];
}
