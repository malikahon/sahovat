-- ============================================================
-- Migration 005: PayMe transactions + Saved cards
-- ============================================================

-- PayMe Merchant API transaction tracking.
-- Required for idempotent handling of the Merchant API methods
-- (CheckPerformTransaction, CreateTransaction, PerformTransaction, etc.)
CREATE TABLE payme_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payme_id VARCHAR(255) UNIQUE NOT NULL,
  donation_id UUID NOT NULL REFERENCES donations(id),
  state SMALLINT NOT NULL DEFAULT 1,
  amount BIGINT NOT NULL,
  reason SMALLINT,
  create_time BIGINT NOT NULL,
  perform_time BIGINT NOT NULL DEFAULT 0,
  cancel_time BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payme_transactions_donation ON payme_transactions(donation_id);
CREATE INDEX idx_payme_transactions_create_time ON payme_transactions(create_time);

-- Saved card tokens from PayMe Subscribe API.
-- Only the opaque token is stored; raw card numbers never persist.
CREATE TABLE saved_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_token TEXT NOT NULL,
  card_number_masked VARCHAR(20) NOT NULL,
  card_expire VARCHAR(5) NOT NULL,
  card_type VARCHAR(10) NOT NULL DEFAULT 'unknown',
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saved_cards_user ON saved_cards(user_id);

-- Only one default card per user
CREATE UNIQUE INDEX idx_saved_cards_one_default
  ON saved_cards(user_id) WHERE is_default = true;

-- Trigger for updated_at on saved_cards
CREATE TRIGGER set_saved_cards_updated_at
  BEFORE UPDATE ON saved_cards
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();
