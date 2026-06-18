import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Editable fields of an existing sensor. `type` is intentionally immutable —
 * readings are already typed against it, and the unit now lives on the type — so
 * only the descriptive `name` can change. Optional; omitted = untouched.
 */
@InputType()
export class UpdateSensorInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}
