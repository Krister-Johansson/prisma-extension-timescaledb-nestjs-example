import { ArgsType, Field, GraphQLISODateTime, ID } from '@nestjs/graphql';
import { IsDate, IsOptional, IsString, Matches } from 'class-validator';
import { INTERVAL_PATTERN } from '../../common/interval';

@ArgsType()
export class ReadingBucketArgs {
  @Field(() => ID)
  @IsString()
  sensorId!: string;

  @Field({
    defaultValue: '1 hour',
    description: 'time_bucket interval, e.g. "1 hour".',
  })
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

@ArgsType()
export class ReadingBucketMultiArgs {
  @Field(() => [ID])
  @IsString({ each: true })
  sensorIds!: string[];

  @Field({
    defaultValue: '1 hour',
    description: 'time_bucket interval, e.g. "1 hour".',
  })
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

@ArgsType()
export class HourlyArgs {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  sensorId?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @IsDate()
  start?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @IsDate()
  end?: Date;
}

@ArgsType()
export class RefreshHourlyArgs {
  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @IsDate()
  start?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @IsDate()
  end?: Date;
}
