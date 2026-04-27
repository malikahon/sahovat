import type { CampaignCategory, OtpChannel, VerificationStatus } from '../../types/entities.js';

/**
 * Raw user row from the database (includes password_hash).
 */
export interface UserRow {
  id: string;
  phone_number: string | null;
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
  // Telegram identity (added in migration 008)
  telegram_id: string | null;
  telegram_username: string | null;
  telegram_photo_url: string | null;
  telegram_linked_at: string | null;
  preferred_otp_channel: OtpChannel;
  // Email channel (added in migration 009)
  email: string | null;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * User data returned in API responses (excludes password_hash, adds has_password).
 */
export type SafeUser = Omit<UserRow, 'password_hash'> & { has_password: boolean };

/**
 * Mock OneID profile response shape.
 */
export interface OneIdProfile {
  id: string;
  full_name: string;
  passport_serial: string;
}
