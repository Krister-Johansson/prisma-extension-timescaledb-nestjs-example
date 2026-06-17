// PostgreSQL interval like "1 hour", "30 minutes", "7 days".
export const INTERVAL_PATTERN =
  /^\d+\s+(microsecond|millisecond|second|minute|hour|day|week|month|year)s?$/;
