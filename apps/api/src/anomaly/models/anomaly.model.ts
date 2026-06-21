import {
  Field,
  Float,
  GraphQLISODateTime,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { AnomalySeverity } from '../../generated/prisma/enums.js';

registerEnumType(AnomalySeverity, { name: 'AnomalySeverity' });

/** A reading flagged anomalous by the rolling-MAD detector. */
@ObjectType()
export class Anomaly {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  sensorId!: string;

  @Field(() => GraphQLISODateTime)
  time!: Date;

  @Field(() => Float)
  value!: number;

  /** Modified z-score (|value − median| / robust σ). */
  @Field(() => Float)
  score!: number;

  /** Recent-window median the value was judged against. */
  @Field(() => Float)
  median!: number;

  /** Median absolute deviation of the recent window. */
  @Field(() => Float)
  mad!: number;

  @Field(() => AnomalySeverity)
  severity!: AnomalySeverity;

  /** OpenRouter-generated summary, filled in asynchronously (null until then). */
  @Field(() => String, { nullable: true })
  aiSummary?: string | null;

  /** Set when dismissed/acknowledged by an operator; null = still open. */
  @Field(() => GraphQLISODateTime, { nullable: true })
  acknowledgedAt?: Date | null;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
}
