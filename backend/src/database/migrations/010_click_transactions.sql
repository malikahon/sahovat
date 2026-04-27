-- ============================================================
-- Migration 010: Click transactions
-- ============================================================
-- Tracks Click payment transactions for idempotent webhook handling.
-- Mirrors payme_transactions structure adapted for Click's Prepare/Complete flow.

CREATE TABLE click_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  click_trans_id VARCHAR(64) UNIQUE NOT NULL,
  donation_id UUID NOT NULL REFERENCES donations(id),
  merchant_prepare_id UUID NOT NULL,
  state SMALLINT NOT NULL DEFAULT 0,
  amount BIGINT NOT NULL,
  error SMALLINT,
  error_note TEXT,
  create_time TIMESTAMPTZ DEFAULT NOW(),
  perform_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_click_trans_donation ON click_transactions(donation_id);