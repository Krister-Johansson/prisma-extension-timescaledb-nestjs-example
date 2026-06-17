import { Field, Float, ObjectType, registerEnumType } from '@nestjs/graphql';

/** Hypertables exposed to the admin API (Prisma model names). */
export enum HypertableModel {
  SensorReading = 'SensorReading',
}

registerEnumType(HypertableModel, { name: 'HypertableModel' });

/**
 * Combined introspection for a hypertable. Byte sizes and counts are BIGINT in
 * TimescaleDB; exposed here as Float (safe up to 2^53 — plenty for a demo).
 */
@ObjectType()
export class HypertableStats {
  @Field(() => Float)
  totalBytes!: number;

  @Field(() => Float)
  tableBytes!: number;

  @Field(() => Float)
  indexBytes!: number;

  @Field(() => Float)
  toastBytes!: number;

  @Field(() => Float)
  approximateRowCount!: number;

  @Field(() => Float)
  totalChunks!: number;

  @Field(() => Float)
  compressedChunks!: number;

  @Field(() => Float, { nullable: true })
  beforeCompressionBytes!: number | null;

  @Field(() => Float, { nullable: true })
  afterCompressionBytes!: number | null;
}
