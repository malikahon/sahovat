-- ============================================================
-- Migration 011: Per-event, per-channel notification preferences
--
-- Long-format table: one row per (user, event_type, channel).
-- Lets the NotificationDispatcher fan out to a Set<Channel> per
-- event with maximum flexibility. Adding new event types or
-- channels never requires ALTER TABLE.
--
-- Backfill: for every existing user, insert default rows for all
-- 7 event types × {sms, telegram, email}. SMS+Telegram default to
-- enabled; email defaults to enabled only when the user already
-- has a verified email (otherwise the user must verify first).
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type  TEXT        NOT NULL,
  channel     TEXT        NOT NULL,
  enabled     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, event_type, channel),
  CONSTRAINT notification_preferences_event_check CHECK (
    event_type IN (
      'donation_completed',
      'campaign_verified',
      'withdrawal_status_changed',
      'recurring_charge_succeeded',
      'recurring_charge_failed',
      'campaign_milestone_reached',
      'contact_message_received'
    )
  ),
  CONSTRAINT notification_preferences_channel_check CHECK (
    channel IN ('sms', 'telegram', 'email')
  )
);

-- Hot-path index: dispatcher reads (user_id, event_type) → channels
-- where enabled=true. Partial index over the enabled rows only.
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_event_enabled
  ON notification_preferences (user_id, event_type)
  WHERE enabled = TRUE;

-- ============================================================
-- BACKFILL
-- ============================================================
--
-- Generate (event_type, channel, enabled-default) Cartesian product,
-- then INSERT for every user. ON CONFLICT DO NOTHING makes this
-- migration idempotent.

INSERT INTO notification_preferences (user_id, event_type, channel, enabled)
SELECT
  u.id AS user_id,
  e.event_type,
  c.channel,
  CASE
    -- Email channel: default enabled only when user has a verified email.
    WHEN c.channel = 'email' AND u.email_verified_at IS NULL THEN FALSE
    ELSE TRUE
  END AS enabled
FROM users u
CROSS JOIN (
  VALUES
    ('donation_completed'),
    ('campaign_verified'),
    ('withdrawal_status_changed'),
    ('recurring_charge_succeeded'),
    ('recurring_charge_failed'),
    ('campaign_milestone_reached'),
    ('contact_message_received')
) AS e(event_type)
CROSS JOIN (
  VALUES ('sms'), ('telegram'), ('email')
) AS c(channel)
ON CONFLICT (user_id, event_type, channel) DO NOTHING;
