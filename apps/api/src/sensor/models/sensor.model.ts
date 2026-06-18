import {
  Field,
  Float,
  GraphQLISODateTime,
  ID,
  ObjectType,
} from '@nestjs/graphql';

@ObjectType()
export class SensorReading {
  @Field(() => GraphQLISODateTime)
  time!: Date;

  @Field(() => ID)
  sensorId!: string;

  @Field(() => Float)
  value!: number;
}

@ObjectType()
export class Sensor {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  /** FK to the sensor's measurement type; the full `type` (with label + unit) is
   * added by the resolver's @ResolveField. */
  @Field()
  typeKey!: string;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  /** The group this sensor belongs to, if any (see the grouping tree). */
  @Field(() => ID, { nullable: true })
  groupId!: string | null;

  // `readings` is added to the schema by the resolver's @ResolveField (batched
  // via DataLoader) — intentionally not a property here so plain Prisma rows
  // satisfy this type.
}
