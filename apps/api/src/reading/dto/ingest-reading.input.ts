import {
  Field,
  Float,
  GraphQLISODateTime,
  ID,
  InputType,
} from '@nestjs/graphql';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

@InputType()
export class IngestReadingInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  sensorId!: string;

  @Field(() => Float)
  @IsNumber()
  value!: number;

  @Field(() => GraphQLISODateTime, {
    nullable: true,
    description: 'Defaults to now() if omitted.',
  })
  @IsOptional()
  @IsDate()
  time?: Date;
}
