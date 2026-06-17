import { BadRequestException } from '@nestjs/common';
import { assertInterval, type Interval } from 'prisma-extension-timescaledb';

// PostgreSQL interval like "1 hour", "30 minutes", "7 days".
export const INTERVAL_PATTERN =
  /^\d+\s+(microsecond|millisecond|second|minute|hour|day|week|month|year)s?$/;

/**
 * Validate an interval string at a request boundary: throws `BadRequest` (400)
 * on a malformed value, and narrows the type to `Interval` for the extension.
 */
export function assertIntervalArg(value: string): asserts value is Interval {
  if (!INTERVAL_PATTERN.test(value)) {
    throw new BadRequestException(
      `Invalid interval: "${value}" (expected e.g. "1 hour", "30 minutes")`,
    );
  }
  assertInterval(value);
}
