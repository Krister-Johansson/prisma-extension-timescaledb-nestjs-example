import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { SensorType } from '../../generated/prisma/enums.js';

@InputType()
export class CreateSensorInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Field(() => SensorType)
  @IsEnum(SensorType)
  type!: SensorType;

  @Field({ description: 'Unit of measure, e.g. °C, hPa, %.' })
  @IsString()
  @IsNotEmpty()
  unit!: string;
}
