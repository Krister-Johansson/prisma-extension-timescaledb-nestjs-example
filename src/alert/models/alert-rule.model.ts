import {
  Field,
  Float,
  GraphQLISODateTime,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { AlertDirection, AlertState } from '../../generated/prisma/enums.js';

registerEnumType(AlertDirection, { name: 'AlertDirection' });
registerEnumType(AlertState, { name: 'AlertState' });

@ObjectType()
export class AlertRule {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  sensorId!: string;

  @Field(() => AlertDirection)
  direction!: AlertDirection;

  @Field(() => Float)
  threshold!: number;

  @Field(() => Float)
  clearThreshold!: number;

  @Field()
  severity!: string;

  @Field()
  enabled!: boolean;

  @Field(() => AlertState)
  state!: AlertState;

  @Field(() => GraphQLISODateTime, { nullable: true })
  lastFiredAt!: Date | null;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}
