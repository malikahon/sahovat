import { describe, it, expect } from 'vitest';
import { pdfService } from '../../../src/services/pdf.service.js';
import type { Donation, Campaign } from '../../../src/types/entities.js';
import { DonationStatus, CampaignStatus, CampaignCategory, PaymentProvider } from '../../../src/types/entities.js';

const mockDonation: Donation = {
  id: 'a1b2c3d4-0000-0000-0000-000000000001',
  campaign_id: 'a1b2c3d4-0000-0000-0000-000000000002',
  donor_id: 'a1b2c3d4-0000-0000-0000-000000000003',
  amount: 100_000,
  platform_fee: 1_000,
  net_amount: 99_000,
  payment_provider: PaymentProvider.PAYME,
  payment_transaction_id: 'TXN-TEST-001',
  status: DonationStatus.COMPLETED,
  is_anonymous: false,
  donor_display_name: 'Ali Valiyev',
  note: 'Keep it up!',
  created_at: '2025-01-01T10:00:00.000Z',
  completed_at: '2025-01-01T10:01:00.000Z',
};

const mockCampaign: Campaign = {
  id: 'a1b2c3d4-0000-0000-0000-000000000002',
  creator_id: 'a1b2c3d4-0000-0000-0000-000000000004',
  title: 'Medical Aid for Tashkent Children',
  description: 'Helping sick children in Tashkent.',
  category: CampaignCategory.MEDICAL,
  goal_amount: 5_000_000,
  current_amount: 2_000_000,
  status: CampaignStatus.ACTIVE,
  region: null,
  is_verified: true,
  end_date: null,
  cover_image_url: null,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
};

describe('pdfService.generateDonationReceipt', () => {
  it('returns a non-empty Buffer', async () => {
    const buffer = await pdfService.generateDonationReceipt(mockDonation, mockCampaign, 'Ali Valiyev');
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('produces a valid PDF (starts with %PDF magic bytes)', async () => {
    const buffer = await pdfService.generateDonationReceipt(mockDonation, mockCampaign, 'Ali Valiyev');
    const header = buffer.toString('ascii', 0, 4);
    expect(header).toBe('%PDF');
  });

  it('generates a receipt for an anonymous donor', async () => {
    const anonDonation: Donation = { ...mockDonation, is_anonymous: true };
    const buffer = await pdfService.generateDonationReceipt(anonDonation, mockCampaign, 'Anonymous');
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
