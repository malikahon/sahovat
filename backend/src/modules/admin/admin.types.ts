import type { CampaignCategory, CampaignStatus, VerificationStatus } from '../../types/entities.js';

// ============================================================
// DATABASE ROW TYPES
// ============================================================

export interface AdminUserRow {
  id: string;
  phone_number: string;
  display_name: string | null;
  is_verified: boolean;
  is_admin: boolean;
  is_banned: boolean;
  verification_status: VerificationStatus;
  preferred_categories: CampaignCategory[];
  language_preference: string;
  created_at: string;
  updated_at: string;
  // joined stats
  campaign_count: string; // comes back as string from PG COUNT
  total_donated: string;  // comes back as string from PG SUM
}

export interface AdminCampaignRow {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  category: CampaignCategory;
  goal_amount: string;
  current_amount: string;
  status: CampaignStatus;
  region: string | null;
  is_verified: boolean;
  end_date: string | null;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
  // joined
  creator_display_name: string | null;
  creator_phone: string;
  donor_count: string;
  document_count: string;
}

export interface AdminActionRow {
  id: string;
  admin_id: string;
  admin_display_name: string | null;
  action_type: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AdminSettingsRow {
  id: string;
  master_card_number_encrypted: string;
  master_card_holder_name: string;
  platform_fee_percentage: string; // numeric comes back as string
  updated_at: string;
  updated_by: string | null;
  updater_display_name: string | null;
}
