-- ============================================================
-- Migration 008: Telegram identity + OTP channel preference
--
-- Adds Telegram-related columns to `users` so users can log in or
-- link their account via the Telegram Login Widget. Also introduces
-- a per-user preferred OTP channel (sms vs telegram).
--
-- Importantly, this migration makes `users.phone_number` nullable so
-- a user who signs up via Telegram alone (no SMS) can exist without
-- a phone. The unique constraint is preserved via a partial unique
-- index that only applies when `phone_number IS NOT NULL`.
-- ============================================================

-- ------------------------------------------------------------
-- Telegram identity columns
-- ------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telegram_id          BIGINT,
  ADD COLUMN IF NOT EXISTS telegram_username    TEXT,
  ADD COLUMN IF NOT EXISTS telegram_photo_url   TEXT,
  ADD COLUMN IF NOT EXISTS telegram_linked_at   TIMESTAMPTZ;

-- Partial unique index — only enforced when telegram_id is set.
CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_id_unique
  ON users(telegram_id)
  WHERE telegram_id IS NOT NULL;

-- ------------------------------------------------------------
-- Per-user preferred OTP channel
-- ------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferred_otp_channel TEXT NOT NULL DEFAULT 'sms';

-- Add CHECK constraint conditionally (no IF NOT EXISTS for constraints in older PG;
-- guarded by a DO block so re-running this migration is safe).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_preferred_otp_channel_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_preferred_otp_channel_check
      CHECK (preferred_otp_channel IN ('sms', 'telegram'));
  END IF;
END $$;

-- ------------------------------------------------------------
-- Make phone_number nullable + replace UNIQUE constraint with
-- a partial unique index.
-- ------------------------------------------------------------

-- Drop the original NOT NULL.
ALTER TABLE users
  ALTER COLUMN phone_number DROP NOT NULL;

-- Drop the original UNIQUE constraint (auto-named by Postgres on
-- table create as `users_phone_number_key`). Wrapped in DO so
-- re-running is safe.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_phone_number_key'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_phone_number_key;
  END IF;
END $$;

-- Drop the redundant non-unique idx_users_phone created in 001.
-- The new partial unique index below covers all phone lookups.
DROP INDEX IF EXISTS idx_users_phone;

-- Partial unique index: enforces uniqueness only when phone is set,
-- and serves as the lookup index for phone-based queries.
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_number_unique
  ON users(phone_number)
  WHERE phone_number IS NOT NULL;
