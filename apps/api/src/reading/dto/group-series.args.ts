import {
  ArgsType,
  Field,
  GraphQLISODateTime,
  ID,
  InputType,
} from '@nestjs/graphql';
import {
  ArrayMaxSize,
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { INTERVAL_PATTERN } from '../../common/interval';
import { SeriesAgg } from '../models/group-series.model';

@InputType()
export class GroupSeriesSpecInput {
  @Field(() => ID)
  @IsString()
  groupId!: string;

  /** Limit to one measurement type (key), or omit for all sensors in the group. */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'type must be a measurement type key (uppercase, digits, _)',
  })
  type?: string;

  @Field(() => SeriesAgg, { defaultValue: SeriesAgg.AVG })
  @IsEnum(SeriesAgg)
  agg!: SeriesAgg;
}

@ArgsType()
export class GroupSeriesArgs {
  @Field(() => [GroupSeriesSpecInput])
  @ValidateNested({ each: true })
  @Type(() => GroupSeriesSpecInput)
  @ArrayMaxSize(12, { message: 'at most 12 overlay series' })
  specs!: GroupSeriesSpecInput[];

  @Field({ defaultValue: '1 hour' })
  @Matches(INTERVAL_PATTERN, {
    message: 'bucket must be an interval like "1 hour" or "30 minutes"',
  })
  bucket!: string;

  @Field(() => GraphQLISODateTime)
  @IsDate()
  start!: Date;

  @Field(() => GraphQLISODateTime)
  @IsDate()
  end!: Date;
}
