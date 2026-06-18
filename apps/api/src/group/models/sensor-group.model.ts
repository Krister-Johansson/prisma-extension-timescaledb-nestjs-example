import {
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
} from '@nestjs/graphql';

/** A node in the sensor grouping tree. Returned as a flat list (`parentId`
 * links the tree); the client assembles it. No depth limit. */
@ObjectType()
export class SensorGroup {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field(() => ID, { nullable: true })
  parentId!: string | null;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  /** Sensors directly in this group (not counting descendants). */
  @Field(() => Int)
  sensorCount!: number;
}
