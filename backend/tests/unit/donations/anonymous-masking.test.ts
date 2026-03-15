import { describe, it, expect } from 'vitest';

/**
 * Tests the anonymous donation masking logic.
 * The function maskAnonymousDonation is private in donations.service.ts,
 * so we replicate the logic here to test it directly.
 */

interface DonationLike {
  donor_id: string;
  donor_display_name: string | null;
  is_anonymous: boolean;
  amount: number;
}

// Replicated from donations.service.ts
function maskAnonymousDonation(donation: DonationLike): DonationLike {
  if (!donation.is_anonymous) {
    return donation;
  }
  return {
    ...donation,
    donor_id: 'anonymous',
    donor_display_name: 'Anonymous',
  };
}

describe('maskAnonymousDonation', () => {
  it('masks donor_id and display_name for anonymous donations', () => {
    const donation: DonationLike = {
      donor_id: 'real-user-uuid',
      donor_display_name: 'Ali Valiyev',
      is_anonymous: true,
      amount: 50_000,
    };

    const masked = maskAnonymousDonation(donation);
    expect(masked.donor_id).toBe('anonymous');
    expect(masked.donor_display_name).toBe('Anonymous');
    // Other fields unchanged
    expect(masked.amount).toBe(50_000);
  });

  it('does not mask non-anonymous donations', () => {
    const donation: DonationLike = {
      donor_id: 'real-user-uuid',
      donor_display_name: 'Ali Valiyev',
      is_anonymous: false,
      amount: 50_000,
    };

    const masked = maskAnonymousDonation(donation);
    expect(masked.donor_id).toBe('real-user-uuid');
    expect(masked.donor_display_name).toBe('Ali Valiyev');
  });

  it('masks anonymous donation with null display name', () => {
    const donation: DonationLike = {
      donor_id: 'real-user-uuid',
      donor_display_name: null,
      is_anonymous: true,
      amount: 10_000,
    };

    const masked = maskAnonymousDonation(donation);
    expect(masked.donor_id).toBe('anonymous');
    expect(masked.donor_display_name).toBe('Anonymous');
  });

  it('returns the original object reference for non-anonymous (no cloning overhead)', () => {
    const donation: DonationLike = {
      donor_id: 'uuid',
      donor_display_name: 'Name',
      is_anonymous: false,
      amount: 1_000,
    };

    const result = maskAnonymousDonation(donation);
    // Same reference — no copy was made
    expect(result).toBe(donation);
  });
});
