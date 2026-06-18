import {
  Field,
  Float,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
} from '@nestjs/graphql';

@ObjectType()
export class Emulator {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  sensorId!: string;

  @Field(() => Float)
  min!: number;

  @Field(() => Float)
  max!: number;

  @Field(() => Int, { description: 'Seconds between ingested readings.' })
  intervalSeconds!: number;

  @Field()
  running!: boolean;

  @Field(() => Float, { nullable: true })
  lastValue!: number | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  lastTickAt!: Date | null;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
}
