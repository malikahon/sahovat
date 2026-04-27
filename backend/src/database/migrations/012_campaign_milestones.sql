-- ============================================================
-- Migration 012: Campaign milestone tracking
--
-- Adds `last_milestone_notified` to `campaigns`. The dispatcher
-- compares this against (current_amount / goal_amount * 100) at
-- every donation to detect newly-crossed thresholds (25/50/75/90/100).
-- Updating this column atomically with the balance update prevents
-- duplicate milestone notifications under concurrent donations.
--
-- Backfill: set the column to the highest already-crossed threshold
-- so historical milestones never re-fire on first deploy.
-- ============================================================

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS last_milestone_notified SMALLINT NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'campaigns_last_milestone_notified_check'
  ) THEN
    ALTER TABLE campaigns
      ADD CONSTRAINT campaigns_last_milestone_notified_check
      CHECK (last_milestone_notified IN (0, 25, 50, 75, 90, 100));
  END IF;
END $$;

-- Backfill: pick the largest threshold already crossed, so we don't
-- spam organizers with milestones for campaigns already past 50%/75%/etc.
UPDATE campaigns
SET last_milestone_notified = CASE
  WHEN goal_amount = 0 THEN 0
  WHEN current_amount * 100 >= goal_amount * 100 THEN 100
  WHEN current_amount * 100 >= goal_amount * 90  THEN 90
  WHEN current_amount * 100 >= goal_amount * 75  THEN 75
  WHEN current_amount * 100 >= goal_amount * 50  THEN 50
  WHEN current_amount * 100 >= goal_amount * 25  THEN 25
  ELSE 0
END
WHERE last_milestone_notified = 0;
