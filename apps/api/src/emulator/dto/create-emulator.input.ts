import { Field, Float, ID, InputType, Int } from '@nestjs/graphql';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';

@InputType()
export class CreateEmulatorInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  sensorId!: string;

  @Field(() => Float)
  @IsNumber()
  min!: number;

  @Field(() => Float)
  @IsNumber()
  max!: number;

  @Field(() => Int, {
    description: 'Seconds between ingested readings (1–3600).',
  })
  @IsInt()
  @Min(1)
  @Max(3600)
  intervalSeconds!: number;
}
