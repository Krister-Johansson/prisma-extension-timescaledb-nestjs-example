import {
  Field,
  Float,
  GraphQLISODateTime,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { AlertEventKind } from '../../generated/prisma/enums.js';

registerEnumType(AlertEventKind, { name: 'AlertEventKind' });

@ObjectType()
export class AlertEvent {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  sensorId!: string;

  @Field(() => AlertEventKind)
  kind!: AlertEventKind;

  @Field(() => Float)
  value!: number;

  @Field()
  message!: string;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
}
