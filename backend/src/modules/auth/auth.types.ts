import type { CampaignCategory, VerificationStatus } from '../../types/entities.js';

/**
 * Raw user row from the database.
 * Used internally by auth.service for DB operations.
 */
export interface UserRow {
  id: string;
  phone_number: string | null;
  email: string | null;
  email_verified_at: string | null;
  display_name: string | null;
  password_hash: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | null;
  preferred_categories: CampaignCategory[];
  is_verified: boolean;
  is_admin: boolean;
  is_banned: boolean;
  verification_status: VerificationStatus;
  oneid_id: string | null;
  oneid_verified_at: string | null;
  language_preference: 'uz' | 'ru' | 'en';
  created_at: string;
  updated_at: string;
}

/**
 * User data returned in API responses (excludes password_hash, adds has_password).
 */
export type SafeUser = Omit<UserRow, 'password_hash'> & { has_password: boolean };
