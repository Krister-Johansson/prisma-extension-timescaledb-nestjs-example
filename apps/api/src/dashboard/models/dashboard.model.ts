import {
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
} from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

/** One widget on a dashboard. `type` selects the renderer + config schema;
 * `config` is a type-specific JSON blob (validated client-side by Zod). x/y/w/h
 * are react-grid-layout grid units. */
@ObjectType()
export class Widget {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  dashboardId!: string;

  @Field()
  type!: string;

  @Field(() => Int)
  x!: number;

  @Field(() => Int)
  y!: number;

  @Field(() => Int)
  w!: number;

  @Field(() => Int)
  h!: number;

  @Field(() => GraphQLJSON)
  config!: unknown;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
}

/** A customizable dashboard, rendered as a tab. */
@ObjectType()
export class Dashboard {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  slug!: string;

  @Field(() => Int)
  position!: number;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => [Widget])
  widgets!: Widget[];
}
