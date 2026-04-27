import { describe, it, expect } from 'vitest';
import {
  computeCrossedMilestones,
  highestCrossed,
} from '../../../../src/services/notifications/milestones.js';

describe('milestones', () => {
  describe('computeCrossedMilestones', () => {
    it('returns [] when goal is zero', () => {
      expect(computeCrossedMilestones(0, 5_000, 0, 0)).toEqual([]);
    });

    it('returns [] when amount did not increase', () => {
      expect(computeCrossedMilestones(1_000, 1_000, 10_000, 0)).toEqual([]);
      expect(computeCrossedMilestones(1_000, 999, 10_000, 0)).toEqual([]);
    });

    it('detects 25% crossing on a small donation', () => {
      // 24% → 26% of 10_000
      expect(computeCrossedMilestones(2_400, 2_600, 10_000, 0)).toEqual([25]);
    });

    it('detects multiple crossings in one donation', () => {
      // 20% → 80% of 10_000 — crosses 25, 50, 75
      expect(computeCrossedMilestones(2_000, 8_000, 10_000, 0)).toEqual([25, 50, 75]);
    });

    it('crosses the full set when goal is funded all at once', () => {
      expect(computeCrossedMilestones(0, 10_000, 10_000, 0)).toEqual([25, 50, 75, 90, 100]);
    });

    it('skips already-notified thresholds (idempotency)', () => {
      // prev_notified=50, donation pushes 60% → 80%. Should fire only 75.
      expect(computeCrossedMilestones(6_000, 8_000, 10_000, 50)).toEqual([75]);
    });

    it('returns [] when re-running with same lastNotified at 100%', () => {
      expect(computeCrossedMilestones(10_000, 10_500, 10_000, 100)).toEqual([]);
    });

    it('does not fire crossing when prev was already past threshold', () => {
      // Prev 26%, new 30% — neither prev nor new crosses 25 (prev already past).
      expect(computeCrossedMilestones(2_600, 3_000, 10_000, 25)).toEqual([]);
    });
  });

  describe('highestCrossed', () => {
    it('returns fallback when crossed is empty', () => {
      expect(highestCrossed([], 50)).toBe(50);
    });

    it('returns last (highest) entry when crossed is non-empty', () => {
      expect(highestCrossed([25, 50, 75], 0)).toBe(75);
      expect(highestCrossed([100], 90)).toBe(100);
    });
  });
});
