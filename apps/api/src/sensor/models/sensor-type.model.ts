import { Field, GraphQLISODateTime, ObjectType } from '@nestjs/graphql';

/** A measurement type — user-manageable, so new hardware can be modelled without
 * a migration. `key` is the stable slug a sensor references; `unit` lives here. */
@ObjectType()
export class SensorType {
  @Field()
  key!: string;

  @Field()
  label!: string;

  @Field()
  unit!: string;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
}
