import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

@InputType()
export class CreateSensorTypeInput {
  @Field({ description: 'Stable slug, e.g. CO2 or PM2_5 (A–Z, 0–9, _).' })
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'key must be uppercase letters, digits or underscore',
  })
  @MaxLength(40)
  key!: string;

  @Field({ description: 'Human label, e.g. CO₂.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  label!: string;

  @Field({ description: 'Unit of measure, e.g. ppm, µg/m³.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unit!: string;
}
