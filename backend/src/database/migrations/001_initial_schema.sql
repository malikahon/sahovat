-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create trigger function for updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  is_verified BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  verification_status VARCHAR(20) DEFAULT 'none' CHECK (verification_status IN ('none', 'pending', 'approved', 'rejected')),
  verification_document_url TEXT,
  verification_rejection_reason TEXT,
  language_preference VARCHAR(5) DEFAULT 'uz' CHECK (language_preference IN ('uz', 'ru', 'en')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger for users.updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for users table
CREATE INDEX idx_users_phone_number ON users(phone_number);
CREATE INDEX idx_users_verification_status ON users(verification_status);

-- Withdrawal accounts table
CREATE TABLE IF NOT EXISTS withdrawal_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('payme', 'click', 'uzcard', 'humo')),
  account_number_encrypted TEXT NOT NULL,
  account_holder_name VARCHAR(200) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger for withdrawal_accounts.updated_at
CREATE TRIGGER update_withdrawal_accounts_updated_at BEFORE UPDATE ON withdrawal_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for withdrawal_accounts table
CREATE INDEX idx_withdrawal_accounts_user_id ON withdrawal_accounts(user_id);
CREATE INDEX idx_withdrawal_accounts_user_id_is_primary ON withdrawal_accounts(user_id, is_primary);

-- Fundraisers table
CREATE TABLE IF NOT EXISTS fundraisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('medical', 'education', 'emergency', 'community', 'creative', 'business', 'other')),
  goal_amount DECIMAL(15,2) NOT NULL CHECK (goal_amount > 0),
  current_amount DECIMAL(15,2) DEFAULT 0,
  cover_image_url TEXT,
  video_url TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  is_verified BOOLEAN DEFAULT false,
  withdrawal_account_id UUID REFERENCES withdrawal_accounts ON DELETE SET NULL,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger for fundraisers.updated_at
CREATE TRIGGER update_fundraisers_updated_at BEFORE UPDATE ON fundraisers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for fundraisers table
CREATE INDEX idx_fundraisers_creator_id ON fundraisers(creator_id);
CREATE INDEX idx_fundraisers_status ON fundraisers(status);
CREATE INDEX idx_fundraisers_category ON fundraisers(category);
CREATE INDEX idx_fundraisers_is_verified ON fundraisers(is_verified);
CREATE INDEX idx_fundraisers_status_is_verified ON fundraisers(status, is_verified);

-- Fundraiser documents table
CREATE TABLE IF NOT EXISTS fundraiser_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fundraiser_id UUID NOT NULL REFERENCES fundraisers ON DELETE CASCADE,
  document_type VARCHAR(30) NOT NULL CHECK (document_type IN ('medical_report', 'id_document', 'proof_of_residence', 'financial_statement', 'photo', 'other')),
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fundraiser_documents table
CREATE INDEX idx_fundraiser_documents_fundraiser_id ON fundraiser_documents(fundraiser_id);

-- Donations table
CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fundraiser_id UUID NOT NULL REFERENCES fundraisers ON DELETE CASCADE,
  donor_id UUID REFERENCES users ON DELETE SET NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  platform_fee DECIMAL(15,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(15,2) NOT NULL,
  payment_provider VARCHAR(20) NOT NULL CHECK (payment_provider IN ('payme', 'click', 'uzcard', 'humo')),
  payment_transaction_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  is_anonymous BOOLEAN DEFAULT false,
  donor_display_name VARCHAR(100),
  note TEXT,
  note_edited_at TIMESTAMPTZ,
  requires_verification BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger for donations.updated_at
CREATE TRIGGER update_donations_updated_at BEFORE UPDATE ON donations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for donations table
CREATE INDEX idx_donations_fundraiser_id ON donations(fundraiser_id);
CREATE INDEX idx_donations_donor_id ON donations(donor_id);
CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_fundraiser_id_status ON donations(fundraiser_id, status);

-- Withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fundraiser_id UUID NOT NULL REFERENCES fundraisers ON DELETE CASCADE,
  withdrawal_account_id UUID NOT NULL REFERENCES withdrawal_accounts ON DELETE RESTRICT,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  platform_fee DECIMAL(15,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(15,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  admin_id UUID REFERENCES users ON DELETE SET NULL,
  admin_notes TEXT,
  transaction_reference VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger for withdrawals.updated_at
CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON withdrawals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for withdrawals table
CREATE INDEX idx_withdrawals_fundraiser_id ON withdrawals(fundraiser_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_withdrawals_withdrawal_account_id ON withdrawals(withdrawal_account_id);

-- Platform fees table
CREATE TABLE IF NOT EXISTS platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID REFERENCES donations ON DELETE SET NULL,
  withdrawal_id UUID REFERENCES withdrawals ON DELETE SET NULL,
  amount DECIMAL(15,2) NOT NULL,
  fee_type VARCHAR(20) NOT NULL CHECK (fee_type IN ('donation', 'withdrawal')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for platform_fees table
CREATE INDEX idx_platform_fees_donation_id ON platform_fees(donation_id);
CREATE INDEX idx_platform_fees_withdrawal_id ON platform_fees(withdrawal_id);

-- Admin actions table
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for admin_actions table
CREATE INDEX idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_target_type_target_id ON admin_actions(target_type, target_id);
CREATE INDEX idx_admin_actions_action_type ON admin_actions(action_type);
