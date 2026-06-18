import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class CreateSensorInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Field({ description: 'Measurement type key (see sensorTypes).' })
  @IsString()
  @IsNotEmpty()
  typeKey!: string;
}
