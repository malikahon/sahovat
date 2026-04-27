import { MILESTONE_THRESHOLDS } from './events.js';

/**
 * Compute milestone thresholds crossed by a balance change.
 *
 * Given the previous and new `current_amount`, the campaign's `goal_amount`,
 * and the highest threshold already announced (`lastNotified`), return the
 * list of newly-crossed thresholds (subset of [25, 50, 75, 90, 100]).
 *
 * Idempotency: a re-run with the same `lastNotified` returns []. Crossing
 * multiple thresholds in a single donation (e.g. a huge donation that
 * vaults from 20% to 80%) returns all of them in ascending order so the
 * dispatcher can fire one notification per crossing.
 *
 * @returns sorted ascending list of newly-crossed thresholds.
 */
export function computeCrossedMilestones(
  prevAmount: number,
  newAmount: number,
  goalAmount: number,
  lastNotified: number,
): number[] {
  if (goalAmount <= 0 || newAmount <= prevAmount) return [];

  const newPct = (newAmount / goalAmount) * 100;
  const prevPct = (prevAmount / goalAmount) * 100;

  const crossed: number[] = [];
  for (const t of MILESTONE_THRESHOLDS) {
    if (t > lastNotified && newPct >= t && prevPct < t) {
      crossed.push(t);
    }
  }
  return crossed;
}

/**
 * The highest threshold present in `crossed`, or `lastNotified` if empty.
 * Used to update `campaigns.last_milestone_notified` after dispatching.
 */
export function highestCrossed(crossed: number[], fallback: number): number {
  if (crossed.length === 0) return fallback;
  return crossed[crossed.length - 1] ?? fallback;
}
