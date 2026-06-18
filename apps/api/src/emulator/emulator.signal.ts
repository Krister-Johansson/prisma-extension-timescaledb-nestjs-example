/**
 * Bounded mean-reverting random walk (a discrete Ornstein–Uhlenbeck step). Each
 * value steps from the previous one, so the series stays smooth and natural —
 * it never jumps across the range or sticks at the bounds:
 *
 *   next = current + θ·(mean − current) + σ·range·N(0,1)   clamped to [min, max]
 *
 * - mean = midpoint of [min, max] — the value gravitates toward it.
 * - θ (THETA) — how strongly it reverts to the mean.
 * - σ (SIGMA) — random kick amplitude, scaled to the range.
 */
const THETA = 0.08;
const SIGMA = 0.03;

/** Standard normal sample via the Box–Muller transform. */
function gaussian(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(Math.max(n, lo), hi);

/** Next reading value given the previous one (or the mean if there is none). */
export function nextValue(
  min: number,
  max: number,
  current: number | null,
): number {
  const mean = (min + max) / 2;
  const range = max - min;
  const x = current ?? mean;
  const next = x + THETA * (mean - x) + SIGMA * range * gaussian();
  return Math.round(clamp(next, min, max) * 100) / 100;
}
