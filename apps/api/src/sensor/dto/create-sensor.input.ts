import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

@InputType()
export class CreateSensorInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Field({ description: 'Measurement type key (see sensorTypes).' })
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'typeKey must be uppercase letters, digits or underscore',
  })
  @MaxLength(40)
  typeKey!: string;
}
