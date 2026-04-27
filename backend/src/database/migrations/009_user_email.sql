-- ============================================================
-- Migration 009: Optional email + email verification timestamp
--
-- Adds case-insensitive `email` column (CITEXT) and
-- `email_verified_at` (TIMESTAMPTZ) to `users`. Email is optional;
-- when present it must be unique. Verification logic is enforced
-- in application code (NotificationDispatcher will skip the email
-- channel when email is NULL or email_verified_at is NULL).
-- ============================================================

-- Required for case-insensitive email storage.
CREATE EXTENSION IF NOT EXISTS citext;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email             CITEXT,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Partial unique index — only enforced when email is set.
-- CITEXT makes the comparison case-insensitive automatically.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
  ON users(email)
  WHERE email IS NOT NULL;
