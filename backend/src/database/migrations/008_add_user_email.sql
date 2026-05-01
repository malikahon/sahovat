-- ============================================================
-- Add Email Authentication
-- ============================================================
-- Adds email as an alternative login identifier (alongside phone).
-- Phone becomes nullable; users may sign up with email only.
-- A CHECK constraint ensures every user has at least one identifier.

-- Enable case-insensitive text type for email
CREATE EXTENSION IF NOT EXISTS citext;

-- Email columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email CITEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Phone is no longer required (email-only signups allowed)
ALTER TABLE users
  ALTER COLUMN phone_number DROP NOT NULL;

-- Every user must have at least one identifier
ALTER TABLE users
  ADD CONSTRAINT users_identifier_required
    CHECK (phone_number IS NOT NULL OR email IS NOT NULL);

-- Partial index — only non-null emails participate
CREATE INDEX IF NOT EXISTS idx_users_email
  ON users(email)
  WHERE email IS NOT NULL;
