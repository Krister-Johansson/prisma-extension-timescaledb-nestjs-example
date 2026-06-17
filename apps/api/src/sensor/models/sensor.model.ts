import {
  Field,
  Float,
  GraphQLISODateTime,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { SensorType } from '../../generated/prisma/enums.js';

// Expose the Prisma-generated enum to the GraphQL schema.
registerEnumType(SensorType, {
  name: 'SensorType',
  description: 'Kind of physical quantity a sensor measures.',
});

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

  @Field(() => SensorType)
  type!: SensorType;

  @Field()
  unit!: string;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  // `readings` is added to the schema by the resolver's @ResolveField (batched
  // via DataLoader) — intentionally not a property here so plain Prisma rows
  // satisfy this type.
}
