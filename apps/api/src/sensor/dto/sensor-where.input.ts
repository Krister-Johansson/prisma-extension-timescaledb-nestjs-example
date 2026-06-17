import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SensorType } from '../../generated/prisma/enums.js';

/** Focused filter surface for listing sensors. */
@InputType()
export class SensorWhereInput {
  @Field(() => SensorType, { nullable: true })
  @IsOptional()
  @IsEnum(SensorType)
  type?: SensorType;

  @Field({
    nullable: true,
    description: 'Case-insensitive substring match on name.',
  })
  @IsOptional()
  @IsString()
  nameContains?: string;
}
