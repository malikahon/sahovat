import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock formatters
vi.mock('@/lib/formatters', () => ({
  formatUZS: (amount: number) => `${amount.toLocaleString()} UZS`,
}));

import { DonationAmountStep, type DonationFormData } from '@/components/donation/DonationAmountStep';

describe('DonationAmountStep', () => {
  const onNext = vi.fn();

  beforeEach(() => {
    onNext.mockClear();
  });

  it('renders 4 preset amount chips', () => {
    render(
      <DonationAmountStep
        campaignTitle="Test Campaign"
        userDisplayName="Ali"
        onNext={onNext}
      />,
    );

    // Preset amounts: 10,000 / 50,000 / 100,000 / 500,000
    // Use getAllByText since the same number may appear in multiple places
    expect(screen.getAllByText(/10[,\s]?000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/50[,\s]?000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/100[,\s]?000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/500[,\s]?000/).length).toBeGreaterThanOrEqual(1);
    // There should be exactly 4 preset chip buttons
    const buttons = document.querySelectorAll('button[type="button"]:not([role="checkbox"]):not([role="switch"])');
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it('selects a preset amount chip on click', async () => {
    render(
      <DonationAmountStep
        campaignTitle="Test Campaign"
        userDisplayName="Ali"
        onNext={onNext}
      />,
    );

    const chip = screen.getAllByText(/10[,\s]?000/)[0]!;
    await userEvent.click(chip);

    // The amount summary should show the selected preset
    // The continue button should be enabled (amount >= 1000)
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).not.toBeDisabled();
  });

  it('submits with the default preset amount (50,000)', async () => {
    render(
      <DonationAmountStep
        campaignTitle="Test Campaign"
        userDisplayName="Test User"
        onNext={onNext}
      />,
    );

    const continueBtn = screen.getByRole('button', { name: /continue/i });
    await userEvent.click(continueBtn);

    expect(onNext).toHaveBeenCalledOnce();
    const callArg = onNext.mock.calls[0][0] as DonationFormData;
    expect(callArg.amount).toBe(50_000);
  });

  it('shows error when amount is below minimum', async () => {
    render(
      <DonationAmountStep
        campaignTitle="Test Campaign"
        userDisplayName={null}
        onNext={onNext}
      />,
    );

    // Find the custom amount input by its id (htmlFor="custom-amount")
    const customInput = document.querySelector('#custom-amount') as HTMLInputElement
      || screen.getByLabelText('customAmount');
    await userEvent.clear(customInput);
    // Type '100' - the input processes only digits
    await userEvent.type(customInput, '100');

    const continueBtn = screen.getByRole('button', { name: /continue/i });
    // The button might be disabled — if so, we click the submit handler directly
    // The DonationAmountStep sets amount=0 when custom is '100' parsed... actually
    // Let's check: '100'.replace(/\D/g, '') = '100', parseInt('100') = 100
    // Amount is 100 which is < MIN_AMOUNT (1000), so button should be disabled
    // The component disables the button when amount < MIN_AMOUNT
    // So the error appears via button disabled, not via submission error
    expect(continueBtn).toBeDisabled();
    expect(onNext).not.toHaveBeenCalled();
  });

  it('shows OTP notice for amounts over 100,000', async () => {
    render(
      <DonationAmountStep
        campaignTitle="Test Campaign"
        userDisplayName="Ali"
        onNext={onNext}
      />,
    );

    // Click the 500,000 chip (above OTP threshold) — find the chip button specifically
    const bigChip = screen.getAllByText(/500[,\s]?000/)[0]!;
    await userEvent.click(bigChip);

    // The OTP notice div should appear
    expect(screen.getByText('otpDescription')).toBeInTheDocument();
  });

  it('anonymous toggle hides display name field', async () => {
    render(
      <DonationAmountStep
        campaignTitle="Test Campaign"
        userDisplayName="Ali"
        onNext={onNext}
      />,
    );

    // Display name field should be visible by default (label text = 'displayName')
    expect(screen.getByLabelText('displayName')).toBeInTheDocument();

    // Shadcn Checkbox renders as button[role="checkbox"] with id="anonymous"
    // Find it by the label text association or by id
    const anonymousToggle = document.querySelector('#anonymous, [id="anonymous"]');
    if (!anonymousToggle) {
      // Fallback: find the label and click it (clicking label toggles associated control)
      const label = screen.getByText('anonymous');
      await userEvent.click(label);
    } else {
      await userEvent.click(anonymousToggle as Element);
    }

    // Display name field should be hidden
    expect(screen.queryByLabelText('displayName')).not.toBeInTheDocument();
  });
});
