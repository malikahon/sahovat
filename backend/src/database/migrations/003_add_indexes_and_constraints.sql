-- ============================================================
-- M14: Add unique partial index on payment_transaction_id (only non-null values)
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_payment_transaction_id 
  ON donations (payment_transaction_id) 
  WHERE payment_transaction_id IS NOT NULL;

-- ============================================================
-- M15: Add indexes on commonly sorted/filtered date columns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations (created_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns (created_at);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals (created_at);

-- ============================================================
-- M16: Add updated_at trigger for admin_settings
-- ============================================================
CREATE TRIGGER set_admin_settings_updated_at
  BEFORE UPDATE ON admin_settings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- M17: Add CHECK constraint for exactly one FK in platform_fees
-- ============================================================
ALTER TABLE platform_fees ADD CONSTRAINT chk_platform_fees_one_fk
  CHECK (num_nonnulls(donation_id, withdrawal_id) = 1);

-- ============================================================
-- M23: Add composite index for recurring donation processing
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_recurring_status_next_charge 
  ON recurring_donations (status, next_charge_date) 
  WHERE status = 'active';

-- ============================================================
-- M7: Ensure admin_settings is a singleton table
-- ============================================================
-- First, clean up any duplicate rows keeping only the latest
DELETE FROM admin_settings WHERE id NOT IN (
  SELECT id FROM admin_settings ORDER BY updated_at DESC LIMIT 1
);
-- Add unique constraint that effectively limits to one row
-- (We use a constant expression in a unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_settings_singleton ON admin_settings ((true));
