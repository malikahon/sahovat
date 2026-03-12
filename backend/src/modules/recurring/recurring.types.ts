import type {
  CampaignCategory,
  PaymentProvider,
  RecurringFrequency,
  RecurringStatus,
} from '../../types/entities.js';

// ============================================================
// DATABASE ROW TYPES
// ============================================================

export interface RecurringDonationRow {
  id: string;
  donor_id: string;
  campaign_id: string | null;
  category: CampaignCategory | null;
  amount: number | string; // PG BIGINT may return string
  frequency: RecurringFrequency;
  payment_provider: PaymentProvider;
  status: RecurringStatus;
  next_charge_date: string; // DATE string
  last_charge_date: string | null;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

export interface RecurringDonationWithCampaign extends RecurringDonationRow {
  campaign_title: string | null;
  campaign_cover_image_url: string | null;
}

// ============================================================
// IMPACT STATS
// ============================================================

export interface ImpactStats {
  total_donated: number;
  campaigns_supported: number;
  streak_weeks: number;
  total_donations_count: number;
  recurring_active_count: number;
  recurring_total_monthly: number;
}
