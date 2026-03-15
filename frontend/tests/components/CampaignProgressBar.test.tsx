import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

import { CampaignProgressBar } from '@/components/campaign/CampaignProgressBar';

describe('CampaignProgressBar', () => {
  it('shows 0% when nothing is raised', () => {
    render(<CampaignProgressBar currentAmount={0} goalAmount={1_000_000} />);
    expect(screen.getByText(/0%/)).toBeInTheDocument();
  });

  it('shows 50% when half the goal is raised', () => {
    render(<CampaignProgressBar currentAmount={500_000} goalAmount={1_000_000} />);
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  it('shows 100% when goal is fully reached', () => {
    render(<CampaignProgressBar currentAmount={1_000_000} goalAmount={1_000_000} />);
    expect(screen.getByText(/100%/)).toBeInTheDocument();
  });

  it('caps at 100% even when over-funded', () => {
    render(<CampaignProgressBar currentAmount={2_000_000} goalAmount={1_000_000} />);
    // Should show 100%, not 200%
    expect(screen.getByText(/100%/)).toBeInTheDocument();
    expect(screen.queryByText(/200%/)).not.toBeInTheDocument();
  });

  it('shows 0% when goalAmount is 0 (defensive)', () => {
    render(<CampaignProgressBar currentAmount={100} goalAmount={0} />);
    expect(screen.getByText(/0%/)).toBeInTheDocument();
  });
});
