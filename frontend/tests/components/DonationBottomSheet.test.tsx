import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock API module
vi.mock('@/lib/api', () => ({
  recurringApi: { create: vi.fn() },
  savedCardsApi: { list: vi.fn() },
}));

// Mock all child steps to isolate DonationBottomSheet logic
vi.mock('@/components/donation/DonationAmountStep', () => ({
  DonationAmountStep: ({ onNext }: { onNext: (d: unknown) => void }) => (
    <div data-testid="amount-step">
      <button onClick={() => onNext({ amount: 50_000, isAnonymous: false, displayName: 'Ali', note: '', isRecurring: false, recurringFrequency: null })}>
        Continue
      </button>
    </div>
  ),
}));

vi.mock('@/components/donation/DonationOtpStep', () => ({
  DonationOtpStep: ({ onVerified }: { onVerified: () => void }) => (
    <div data-testid="otp-step">
      <button onClick={onVerified}>Verify OTP</button>
    </div>
  ),
}));

// Mock card selection step with dummy saved card data
vi.mock('@/components/payment/SavedCardSelect', () => ({
  SavedCardSelect: ({ onCardSelected }: { onCardSelected: (id: string) => void }) => (
    <div data-testid="card-step">
      <button onClick={() => onCardSelected('saved-card-001')}>Select Card</button>
    </div>
  ),
}));

vi.mock('@/components/donation/DonationConfirmStep', () => ({
  DonationConfirmStep: ({ onSuccess }: { onSuccess: (id: string) => void }) => (
    <div data-testid="confirm-step">
      <button onClick={() => onSuccess('donation-id-123')}>Pay</button>
    </div>
  ),
}));

vi.mock('@/components/donation/DonationSuccessStep', () => ({
  DonationSuccessStep: () => <div data-testid="success-step">Success!</div>,
}));

// Mock shadcn Sheet component
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

import { DonationBottomSheet } from '@/components/donation/DonationBottomSheet';

describe('DonationBottomSheet', () => {
  const defaultProps = {
    campaignId: 'campaign-uuid',
    campaignTitle: 'Test Campaign',
    isOpen: true,
    onClose: vi.fn(),
    userDisplayName: 'Ali Valiyev',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the sheet when isOpen is true', () => {
    render(<DonationBottomSheet {...defaultProps} />);
    expect(screen.getByTestId('sheet')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<DonationBottomSheet {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument();
  });

  it('shows the amount step initially', () => {
    render(<DonationBottomSheet {...defaultProps} />);
    expect(screen.getByTestId('amount-step')).toBeInTheDocument();
  });

  it('progresses from amount to card selection for amounts <= 100k', async () => {
    render(<DonationBottomSheet {...defaultProps} />);

    // click continue in amount step (mocked to submit 50,000)
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    // should now show card selection step (amount 50k skips OTP, goes to card)
    expect(screen.getByTestId('card-step')).toBeInTheDocument();
    expect(screen.queryByTestId('amount-step')).not.toBeInTheDocument();
  });

  it('progresses from card selection to confirm step', async () => {
    render(<DonationBottomSheet {...defaultProps} />);

    // amount -> card
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    // card -> confirm
    await userEvent.click(screen.getByRole('button', { name: /select card/i }));

    expect(screen.getByTestId('confirm-step')).toBeInTheDocument();
    expect(screen.queryByTestId('card-step')).not.toBeInTheDocument();
  });

  it('shows success step after full flow (amount -> card -> confirm -> success)', async () => {
    render(<DonationBottomSheet {...defaultProps} />);

    // amount -> card
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    // card -> confirm
    await userEvent.click(screen.getByRole('button', { name: /select card/i }));
    // confirm -> success
    await userEvent.click(screen.getByRole('button', { name: /pay/i }));

    expect(screen.getByTestId('success-step')).toBeInTheDocument();
  });
});
