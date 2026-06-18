import { Field, Float, InputType } from '@nestjs/graphql';
import { IsBoolean, IsEnum, IsNumber, IsString } from 'class-validator';
import { AlertDirection } from '../../generated/prisma/enums.js';

/** Full replacement of an existing rule's fields (the rule is keyed by id). */
@InputType()
export class UpdateAlertRuleInput {
  @Field(() => AlertDirection)
  @IsEnum(AlertDirection)
  direction!: AlertDirection;

  @Field(() => Float)
  @IsNumber()
  threshold!: number;

  @Field(() => Float, {
    description: 'Hysteresis reset band edge (must be on the resetting side).',
  })
  @IsNumber()
  clearThreshold!: number;

  @Field()
  @IsString()
  severity!: string;

  @Field()
  @IsBoolean()
  enabled!: boolean;
}
