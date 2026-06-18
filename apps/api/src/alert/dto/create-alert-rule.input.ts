import { Field, Float, ID, InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { AlertDirection } from '../../generated/prisma/enums.js';

@InputType()
export class CreateAlertRuleInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  sensorId!: string;

  @Field(() => AlertDirection, { defaultValue: AlertDirection.ABOVE })
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

  @Field({ defaultValue: 'WARNING' })
  @IsString()
  severity!: string;

  @Field({ defaultValue: true })
  @IsBoolean()
  @IsOptional()
  enabled!: boolean;
}
