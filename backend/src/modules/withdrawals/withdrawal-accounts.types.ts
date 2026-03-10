/**
 * Raw withdrawal account row from the database.
 * Used internally by the service for DB operations.
 */
export interface WithdrawalAccountRow {
  id: string;
  user_id: string;
  provider: string;
  account_number_encrypted: string;
  account_holder_name: string;
  is_primary: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Withdrawal account data returned in API responses.
 * Card number is masked (no encrypted data exposed).
 */
export interface SafeWithdrawalAccount {
  id: string;
  user_id: string;
  provider: string;
  account_number_masked: string;
  account_holder_name: string;
  is_primary: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}
