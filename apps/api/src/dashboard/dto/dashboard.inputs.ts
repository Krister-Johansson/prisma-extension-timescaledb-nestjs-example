import { Field, ID, InputType, Int } from '@nestjs/graphql';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

/** The widget kinds the client can render — also a guard against arbitrary types. */
export const WIDGET_TYPES = [
  'stat',
  'chart',
  'gauge',
  'alerts',
  'table',
  'compare',
] as const;

@InputType()
export class CreateDashboardInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;
}

@InputType()
export class UpdateDashboardInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;
}

@InputType()
export class CreateWidgetInput {
  @Field(() => ID)
  @IsString()
  dashboardId!: string;

  @Field()
  @IsIn(WIDGET_TYPES)
  type!: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(11)
  x?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  y?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  w?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  h?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  config?: unknown;
}

@InputType()
export class UpdateWidgetInput {
  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  config?: unknown;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(11)
  x?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  y?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  w?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  h?: number;
}

/** One widget's grid position, for persisting a drag/resize in bulk. */
@InputType()
export class WidgetLayoutInput {
  @Field(() => ID)
  @IsString()
  id!: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(11)
  x!: number;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  y!: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(12)
  w!: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(24)
  h!: number;
}
