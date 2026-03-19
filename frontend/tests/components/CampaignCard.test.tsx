import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { CampaignWithStats } from '@/lib/types';

// Mock next/link to render as plain anchor
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// Mock next/image to render as plain img
vi.mock('next/image', () => ({
  default: ({ src, alt, ...rest }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...rest} />
  ),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      'categories.medical': 'Medical',
      'categories.education': 'Education',
      goal: 'Goal',
      raised: 'Raised',
      donors: 'Donors',
      daysLeft: 'days left',
      noEndDate: 'No end date',
      verified: 'Verified',
    };
    return map[key] ?? key;
  },
}));

// Mock formatters
vi.mock('@/lib/formatters', () => ({
  formatUZS: (amount: number) => `${amount.toLocaleString()} UZS`,
}));

import CampaignCard from '@/components/campaign/CampaignCard';

const mockCampaign: CampaignWithStats = {
  id: 'test-campaign-uuid',
  creator_id: 'creator-uuid',
  title: 'Help Sick Children in Tashkent',
  description: 'We need funding for surgery.',
  category: 'medical' as import('@/lib/types').CampaignCategory,
  goal_amount: 1_000_000,
  current_amount: 500_000,
  status: 'active' as import('@/lib/types').CampaignStatus,
  region: null,
  is_verified: false,
  end_date: null,
  cover_image_url: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  donor_count: 25,
  progress_percentage: 50,
  creator_display_name: null,
};

describe('CampaignCard', () => {
  it('renders the campaign title', () => {
    render(<CampaignCard campaign={mockCampaign} />);
    expect(screen.getByText('Help Sick Children in Tashkent')).toBeInTheDocument();
  });

  it('renders the category badge', () => {
    render(<CampaignCard campaign={mockCampaign} />);
    expect(screen.getByText('Medical')).toBeInTheDocument();
  });

  it('renders the progress percentage', () => {
    render(<CampaignCard campaign={mockCampaign} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders the goal amount formatted', () => {
    render(<CampaignCard campaign={mockCampaign} />);
    expect(screen.getByText(/1,000,000 UZS/)).toBeInTheDocument();
  });

  it('renders the donor count', () => {
    render(<CampaignCard campaign={mockCampaign} />);
    expect(screen.getByText(/25/)).toBeInTheDocument();
  });

  it('links to the correct campaign detail page', () => {
    render(<CampaignCard campaign={mockCampaign} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/campaigns/test-campaign-uuid');
  });

  it('shows verified badge when campaign is verified', () => {
    const verifiedCampaign = { ...mockCampaign, is_verified: true };
    render(<CampaignCard campaign={verifiedCampaign} />);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('does not show verified badge for unverified campaign', () => {
    render(<CampaignCard campaign={mockCampaign} />);
    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
  });

  it('renders placeholder when no cover image', () => {
    render(<CampaignCard campaign={mockCampaign} />);
    // Should render the first letter of the title as fallback
    expect(screen.getByText('H')).toBeInTheDocument();
  });

  it('renders cover image when provided', () => {
    const withImage = { ...mockCampaign, cover_image_url: 'https://example.com/image.jpg' };
    render(<CampaignCard campaign={withImage} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });
});
