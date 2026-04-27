-- ============================================================
-- Migration 013: Contact messages
--
-- Stores submissions from the public /contact form. Triggers the
-- existing `contact_message_received` notification event on insert
-- so admin gets a Telegram/email alert and the submitter (if they
-- provided an email) gets an auto-reply with the reference code.
--
-- The notification event chain is already wired in
-- services/notifications/{events,channels,messages}.ts; this
-- migration + the contact module just provide the table + writer.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS contact_messages (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NULL REFERENCES users(id) ON DELETE SET NULL,
  name            TEXT         NOT NULL,
  email           CITEXT       NULL,
  phone           TEXT         NULL,
  subject         TEXT         NOT NULL,
  message         TEXT         NOT NULL,
  reference_code  TEXT         NOT NULL UNIQUE,
  source_ip       TEXT         NULL,
  responded_at    TIMESTAMPTZ  NULL,
  admin_notes     TEXT         NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
  ON contact_messages (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_messages_email
  ON contact_messages (email)
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contact_messages_unresponded
  ON contact_messages (created_at DESC)
  WHERE responded_at IS NULL;
