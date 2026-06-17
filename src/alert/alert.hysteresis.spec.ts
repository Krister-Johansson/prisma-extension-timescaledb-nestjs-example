import { AlertDirection, AlertState } from '../generated/prisma/enums.js';
import { evaluate, HysteresisRule, validateBand } from './alert.hysteresis';

const aboveRule = (state: AlertState): HysteresisRule => ({
  direction: AlertDirection.ABOVE,
  threshold: 35,
  clearThreshold: 33,
  state,
});

const belowRule = (state: AlertState): HysteresisRule => ({
  direction: AlertDirection.BELOW,
  threshold: 980,
  clearThreshold: 1000,
  state,
});

describe('hysteresis evaluate (ABOVE)', () => {
  it('raises when value crosses the threshold from OK', () => {
    expect(evaluate(aboveRule(AlertState.OK), 35)).toEqual({
      transition: 'RAISED',
      nextState: AlertState.ALERTING,
    });
  });

  it('stays quiet below the threshold while OK', () => {
    expect(evaluate(aboveRule(AlertState.OK), 34.9)).toEqual({
      transition: 'NONE',
    });
  });

  it('does NOT clear while value lingers in the deadband', () => {
    // 34 is below threshold (35) but above clearThreshold (33) -> still alerting.
    expect(evaluate(aboveRule(AlertState.ALERTING), 34)).toEqual({
      transition: 'NONE',
    });
  });

  it('clears only once value drops to the reset threshold', () => {
    expect(evaluate(aboveRule(AlertState.ALERTING), 33)).toEqual({
      transition: 'CLEARED',
      nextState: AlertState.OK,
    });
  });

  it('absorbs flapping around the threshold (one RAISED, one CLEARED)', () => {
    const series = [34.9, 35, 34.9, 35.1, 34.9, 32.5];
    let state = AlertState.OK;
    const transitions: string[] = [];
    for (const value of series) {
      const decision = evaluate({ ...aboveRule(state), state }, value);
      if (decision.transition !== 'NONE') {
        transitions.push(decision.transition);
        state = decision.nextState;
      }
    }
    expect(transitions).toEqual(['RAISED', 'CLEARED']);
  });
});

describe('hysteresis evaluate (BELOW)', () => {
  it('raises when value drops below the threshold', () => {
    expect(evaluate(belowRule(AlertState.OK), 980)).toEqual({
      transition: 'RAISED',
      nextState: AlertState.ALERTING,
    });
  });

  it('clears only once value recovers past the reset threshold', () => {
    expect(evaluate(belowRule(AlertState.ALERTING), 990)).toEqual({
      transition: 'NONE',
    });
    expect(evaluate(belowRule(AlertState.ALERTING), 1000)).toEqual({
      transition: 'CLEARED',
      nextState: AlertState.OK,
    });
  });
});

describe('validateBand', () => {
  it('accepts a valid ABOVE band', () => {
    expect(validateBand(AlertDirection.ABOVE, 35, 33)).toBeNull();
  });

  it('rejects an ABOVE band where clear >= threshold', () => {
    expect(validateBand(AlertDirection.ABOVE, 35, 35)).toMatch(/ABOVE/);
  });

  it('rejects a BELOW band where clear <= threshold', () => {
    expect(validateBand(AlertDirection.BELOW, 980, 980)).toMatch(/BELOW/);
  });
});
