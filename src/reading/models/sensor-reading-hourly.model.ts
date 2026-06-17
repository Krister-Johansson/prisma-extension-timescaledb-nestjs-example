import {
  Field,
  Float,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
} from '@nestjs/graphql';

/** A row from the `SensorReadingHourly` continuous aggregate (the export layer). */
@ObjectType()
export class SensorReadingHourly {
  @Field(() => GraphQLISODateTime)
  bucket!: Date;

  @Field(() => ID)
  sensorId!: string;

  @Field(() => Float)
  avgValue!: number;

  @Field(() => Float)
  minValue!: number;

  @Field(() => Float)
  maxValue!: number;

  @Field(() => Int)
  samples!: number;
}
