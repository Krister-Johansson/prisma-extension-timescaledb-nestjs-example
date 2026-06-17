import { AlertDirection, AlertState } from '../generated/prisma/enums.js';

/** The fields of an alert rule the state machine needs. */
export interface HysteresisRule {
  direction: AlertDirection;
  threshold: number;
  clearThreshold: number;
  state: AlertState;
}

export type HysteresisDecision =
  | { transition: 'NONE' }
  | { transition: 'RAISED'; nextState: typeof AlertState.ALERTING }
  | { transition: 'CLEARED'; nextState: typeof AlertState.OK };

/**
 * Pure hysteresis evaluation. The gap between `threshold` and `clearThreshold`
 * is the deadband that absorbs oscillation around the trigger point:
 *
 *  - ABOVE: fire once value ≥ threshold; clear only once value ≤ clearThreshold
 *    (clearThreshold < threshold). A 34.9/35/34.9 wobble stays ALERTING.
 *  - BELOW: mirror — fire once value ≤ threshold; clear once value ≥ clearThreshold.
 */
export function evaluate(
  rule: HysteresisRule,
  value: number,
): HysteresisDecision {
  const above = rule.direction === AlertDirection.ABOVE;

  if (rule.state === AlertState.OK) {
    const breached = above ? value >= rule.threshold : value <= rule.threshold;
    return breached
      ? { transition: 'RAISED', nextState: AlertState.ALERTING }
      : { transition: 'NONE' };
  }

  // Currently ALERTING — only clear once we cross back past the reset band.
  const cleared = above
    ? value <= rule.clearThreshold
    : value >= rule.clearThreshold;
  return cleared
    ? { transition: 'CLEARED', nextState: AlertState.OK }
    : { transition: 'NONE' };
}

/**
 * Validate that the reset band sits on the correct side of the threshold.
 * Returns an error message when invalid, otherwise null.
 */
export function validateBand(
  direction: AlertDirection,
  threshold: number,
  clearThreshold: number,
): string | null {
  if (direction === AlertDirection.ABOVE && clearThreshold >= threshold) {
    return 'For ABOVE alerts, clearThreshold must be below threshold.';
  }
  if (direction === AlertDirection.BELOW && clearThreshold <= threshold) {
    return 'For BELOW alerts, clearThreshold must be above threshold.';
  }
  return null;
}
