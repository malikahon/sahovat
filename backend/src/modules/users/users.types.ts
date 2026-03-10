import type { CampaignCategory, VerificationStatus } from '../../types/entities.js';

/**
 * Raw user row from the database (includes password_hash).
 */
export interface UserRow {
  id: string;
  phone_number: string;
  display_name: string | null;
  password_hash: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | null;
  preferred_categories: CampaignCategory[];
  is_verified: boolean;
  is_admin: boolean;
  verification_status: VerificationStatus;
  oneid_id: string | null;
  oneid_verified_at: string | null;
  language_preference: 'uz' | 'ru' | 'en';
  created_at: string;
  updated_at: string;
}

/**
 * User data returned in API responses (excludes password_hash).
 */
export type SafeUser = Omit<UserRow, 'password_hash'>;

/**
 * Mock OneID profile response shape.
 */
export interface OneIdProfile {
  id: string;
  full_name: string;
  passport_serial: string;
}
