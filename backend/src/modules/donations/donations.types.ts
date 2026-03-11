import type { DonationStatus, PaymentProvider } from '../../types/entities.js';

// ============================================================
// DATABASE ROW TYPES
// ============================================================

export interface DonationRow {
  id: string;
  campaign_id: string;
  donor_id: string;
  amount: number;
  platform_fee: number;
  net_amount: number;
  payment_provider: PaymentProvider;
  payment_transaction_id: string | null;
  status: DonationStatus;
  is_anonymous: boolean;
  donor_display_name: string | null;
  note: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface DonationWithCampaignRow extends DonationRow {
  campaign_title: string;
  campaign_cover_image_url: string | null;
}

// ============================================================

export interface PlatformFeeRow {
  id: string;
  donation_id: string | null;
  withdrawal_id: string | null;
  fee_type: 'donation' | 'withdrawal';
  amount: number;
  created_at: string;
}

// ============================================================

export interface DonationReceiptRow {
  id: string;
  donation_id: string;
  file_url: string;
  generated_at: string;
}
