-- ============================================================
-- Migration 002: Add is_banned column to users
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_banned ON users(is_banned) WHERE is_banned = TRUE;
