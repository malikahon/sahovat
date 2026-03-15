-- ============================================================
-- Sahovat Initial Schema
-- ============================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(15) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  password_hash VARCHAR(255),
  date_of_birth DATE,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
  preferred_categories TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  verification_status VARCHAR(20) DEFAULT 'none'
    CHECK (verification_status IN ('none', 'pending', 'approved', 'rejected')),
  oneid_id VARCHAR(100) UNIQUE,
  oneid_verified_at TIMESTAMPTZ,
  language_preference VARCHAR(5) DEFAULT 'uz'
    CHECK (language_preference IN ('uz', 'ru', 'en')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_admin ON users(is_admin) WHERE is_admin = TRUE;

-- ============================================================
-- CAMPAIGNS
-- ============================================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(20) NOT NULL
    CHECK (category IN ('medical', 'education', 'emergency', 'community', 'creative', 'business', 'other')),
  goal_amount BIGINT NOT NULL CHECK (goal_amount > 0),
  current_amount BIGINT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'active', 'paused', 'completed', 'cancelled', 'frozen')),
  region VARCHAR(30)
    CHECK (region IS NULL OR region IN (
      'tashkent', 'tashkent_region', 'samarkand', 'bukhara', 'fergana',
      'andijan', 'namangan', 'kashkadarya', 'surkhandarya', 'khorezm',
      'navoi', 'jizzakh', 'syrdarya', 'karakalpakstan'
    )),
  is_verified BOOLEAN DEFAULT FALSE,
  end_date DATE,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_creator ON campaigns(creator_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_category ON campaigns(category);
CREATE INDEX idx_campaigns_region ON campaigns(region);
CREATE INDEX idx_campaigns_status_category ON campaigns(status, category);

-- ============================================================
-- CAMPAIGN DOCUMENTS
-- ============================================================
CREATE TABLE campaign_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  document_type VARCHAR(30) NOT NULL
    CHECK (document_type IN ('medical_report', 'id_document', 'proof_of_residence', 'financial_statement', 'photo', 'other')),
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  is_private BOOLEAN DEFAULT FALSE,
  notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaign_documents_campaign ON campaign_documents(campaign_id);

-- ============================================================
-- DONATIONS
-- ============================================================
CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  donor_id UUID NOT NULL REFERENCES users(id),
  amount BIGINT NOT NULL CHECK (amount > 0),
  platform_fee BIGINT NOT NULL DEFAULT 0,
  net_amount BIGINT NOT NULL DEFAULT 0,
  payment_provider VARCHAR(20) DEFAULT 'payme'
    CHECK (payment_provider IN ('payme', 'click', 'uzum')),
  payment_transaction_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  is_anonymous BOOLEAN DEFAULT FALSE,
  donor_display_name VARCHAR(100),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_donations_campaign ON donations(campaign_id);
CREATE INDEX idx_donations_donor ON donations(donor_id);
CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_campaign_status ON donations(campaign_id, status);

-- ============================================================
-- WITHDRAWAL ACCOUNTS
-- ============================================================
CREATE TABLE withdrawal_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL
    CHECK (provider IN ('payme', 'uzcard', 'humo')),
  account_number_encrypted TEXT NOT NULL,
  account_holder_name VARCHAR(100) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_withdrawal_accounts_user ON withdrawal_accounts(user_id);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- (Defined early so it can be referenced by subsequent triggers)
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- WITHDRAWALS
-- ============================================================
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  organizer_id UUID NOT NULL REFERENCES users(id),
  withdrawal_account_id UUID NOT NULL REFERENCES withdrawal_accounts(id),
  amount BIGINT NOT NULL CHECK (amount > 0),
  platform_fee BIGINT DEFAULT 0,
  net_amount BIGINT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  card_number_masked VARCHAR(25) NOT NULL,
  cardholder_name VARCHAR(100) NOT NULL,
  admin_notes TEXT,
  transaction_reference VARCHAR(255),
   created_at TIMESTAMPTZ DEFAULT NOW(),
   reviewed_at TIMESTAMPTZ,
   completed_at TIMESTAMPTZ,
   updated_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 CREATE INDEX idx_withdrawals_campaign ON withdrawals(campaign_id);
 CREATE INDEX idx_withdrawals_organizer ON withdrawals(organizer_id);
 CREATE INDEX idx_withdrawals_status ON withdrawals(status);
 CREATE TRIGGER set_updated_at_withdrawals
   BEFORE UPDATE ON withdrawals FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- PLATFORM FEES
-- ============================================================
CREATE TABLE platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID REFERENCES donations(id),
  withdrawal_id UUID REFERENCES withdrawals(id),
  fee_type VARCHAR(20) NOT NULL
    CHECK (fee_type IN ('donation', 'withdrawal')),
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_fees_donation ON platform_fees(donation_id);
CREATE INDEX idx_platform_fees_withdrawal ON platform_fees(withdrawal_id);

-- ============================================================
-- ADMIN ACTIONS
-- ============================================================
CREATE TABLE admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id),
  action_type VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_target ON admin_actions(target_type, target_id);
CREATE INDEX idx_admin_actions_created ON admin_actions(created_at);

-- ============================================================
-- ADMIN SETTINGS (single-row table)
-- ============================================================
CREATE TABLE admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_card_number_encrypted TEXT NOT NULL DEFAULT '',
  master_card_holder_name VARCHAR(100) NOT NULL DEFAULT '',
  platform_fee_percentage NUMERIC(5,2) DEFAULT 1.00
    CHECK (platform_fee_percentage >= 0 AND platform_fee_percentage <= 10),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- ============================================================
-- USER EVENTS (high-write analytics table)
-- ============================================================
CREATE TABLE user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(30) NOT NULL
    CHECK (event_type IN ('campaign_viewed', 'campaign_shared', 'donation_initiated', 'donation_completed')),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_events_user ON user_events(user_id);
CREATE INDEX idx_user_events_session ON user_events(session_id);
CREATE INDEX idx_user_events_campaign ON user_events(campaign_id);
CREATE INDEX idx_user_events_type ON user_events(event_type);
CREATE INDEX idx_user_events_created ON user_events(created_at);

-- ============================================================
-- USER CATEGORY SCORES
-- ============================================================
CREATE TABLE user_category_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL,
  score NUMERIC(10,4) DEFAULT 0,
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, category)
);

CREATE INDEX idx_user_category_scores_user ON user_category_scores(user_id);

-- ============================================================
-- RECURRING DONATIONS
-- ============================================================
CREATE TABLE recurring_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  category VARCHAR(20),
  amount BIGINT NOT NULL CHECK (amount > 0),
  frequency VARCHAR(10) NOT NULL
    CHECK (frequency IN ('weekly', 'monthly')),
  payment_provider VARCHAR(20) DEFAULT 'payme'
    CHECK (payment_provider IN ('payme', 'click', 'uzum')),
  status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'cancelled', 'failed')),
  next_charge_date DATE NOT NULL,
  last_charge_date DATE,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recurring_donations_donor ON recurring_donations(donor_id);
CREATE INDEX idx_recurring_donations_status ON recurring_donations(status);
CREATE INDEX idx_recurring_donations_next_charge ON recurring_donations(next_charge_date);

-- ============================================================
-- DONATION RECEIPTS
-- ============================================================
CREATE TABLE donation_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID NOT NULL UNIQUE REFERENCES donations(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_donation_receipts_donation ON donation_receipts(donation_id);

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_campaigns
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_withdrawal_accounts
  BEFORE UPDATE ON withdrawal_accounts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_user_category_scores
  BEFORE UPDATE ON user_category_scores
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_recurring_donations
  BEFORE UPDATE ON recurring_donations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
