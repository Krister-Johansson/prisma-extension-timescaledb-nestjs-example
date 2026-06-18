import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Editable fields of an existing sensor. `type` is intentionally immutable —
 * readings are already typed against it — so only the descriptive `name`/`unit`
 * can change. Both are optional; omitted fields are left untouched.
 */
@InputType()
export class UpdateSensorInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @Field({ nullable: true, description: 'Unit of measure, e.g. °C, hPa, %.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  unit?: string;
}
