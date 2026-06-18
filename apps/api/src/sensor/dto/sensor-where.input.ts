import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

/** Focused filter surface for listing sensors. */
@InputType()
export class SensorWhereInput {
  @Field({ nullable: true, description: 'Measurement type key.' })
  @IsOptional()
  @IsString()
  typeKey?: string;

  @Field({
    nullable: true,
    description: 'Case-insensitive substring match on name.',
  })
  @IsOptional()
  @IsString()
  nameContains?: string;
}
