'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { DonationAmountStep, type DonationFormData } from './DonationAmountStep';
import { DonationConfirmStep } from './DonationConfirmStep';
import { DonationSuccessStep } from './DonationSuccessStep';
import { SavedCardSelect } from '@/components/payment/SavedCardSelect';
import { OtpDialog } from '@/components/shared/OtpDialog';
import { donationsApi, recurringApi } from '@/lib/api';
import type { VerificationStatus } from '@/lib/types';

// ============================================================
// Types
// ============================================================

type DonationStep = 'amount' | 'otp' | 'card' | 'confirm' | 'success';

interface Props {
  campaignId: string;
  campaignTitle: string;
  isOpen: boolean;
  onClose: () => void;
  userDisplayName: string | null;
  verificationStatus?: VerificationStatus | null;
  platformFeePct?: number; // From admin settings; defaults to 1%
}

const OTP_THRESHOLD = 100_000;
const RESEND_COOLDOWN = 60;

// ============================================================
// Component
// ============================================================

export function DonationBottomSheet({
  campaignId,
  campaignTitle,
  isOpen,
  onClose,
  userDisplayName,
  verificationStatus,
  platformFeePct,
}: Props) {
  const t = useTranslations('donations');

  const [step, setStep] = useState<DonationStep>('amount');
  const [formData, setFormData] = useState<DonationFormData | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [completedDonationId, setCompletedDonationId] = useState<string | null>(null);

  // OTP dialog state
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(RESEND_COOLDOWN);
  const [otpResending, setOtpResending] = useState(false);

  const resetFlow = useCallback(() => {
    setStep('amount');
    setFormData(null);
    setSelectedCardId(null);
    setCompletedDonationId(null);
    setOtpError(null);
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    // Reset after animation completes
    setTimeout(resetFlow, 300);
  }, [onClose, resetFlow]);

  // Countdown timer for OTP
  useEffect(() => {
    if (step !== 'otp' || otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [step, otpCountdown]);

  // Send OTP when entering the OTP step
  const sendDonationOtp = useCallback(async (cId: string, amount: number) => {
    try {
      const res = await donationsApi.requestOtp(cId, amount);
      if (!res.success) {
        setOtpError(res.error || t('errors.otpFailed'));
      }
    } catch {
      setOtpError(t('errors.otpFailed'));
    }
  }, [t]);

  const handleAmountNext = useCallback((data: DonationFormData) => {
    setFormData(data);
    if (data.amount > OTP_THRESHOLD) {
      setOtpError(null);
      setOtpCountdown(RESEND_COOLDOWN);
      setStep('otp');
      sendDonationOtp(campaignId, data.amount);
    } else {
      setStep('card');
    }
  }, [campaignId, sendDonationOtp]);

  const handleOtpSubmit = useCallback(async (code: string) => {
    setOtpSubmitting(true);
    setOtpError(null);
    try {
      const res = await donationsApi.verifyOtp(code);
      if (res.success) {
        setStep('card');
      } else {
        setOtpError(t('otpInvalid'));
      }
    } catch {
      setOtpError(t('otpInvalid'));
    } finally {
      setOtpSubmitting(false);
    }
  }, [t]);

  const handleOtpResend = useCallback(async () => {
    if (otpCountdown > 0 || otpResending || !formData) return;
    setOtpResending(true);
    setOtpError(null);
    try {
      await donationsApi.requestOtp(campaignId, formData.amount);
      setOtpCountdown(RESEND_COOLDOWN);
    } catch {
      setOtpError(t('errors.otpFailed'));
    } finally {
      setOtpResending(false);
    }
  }, [otpCountdown, otpResending, formData, campaignId, t]);

  const handleOtpClose = useCallback(() => {
    // Go back to amount step when closing the OTP dialog
    setStep('amount');
  }, []);

  const handleCardSelected = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
    setStep('confirm');
  }, []);

  const handlePaymentSuccess = useCallback(async (donationId: string) => {
    setCompletedDonationId(donationId);

    // If recurring was requested, create the subscription
    if (formData?.isRecurring && formData.recurringFrequency) {
      try {
        await recurringApi.create({
          campaign_id: campaignId,
          amount: formData.amount,
          frequency: formData.recurringFrequency as import('@/lib/types').RecurringFrequency,
          payment_provider: 'payme' as import('@/lib/types').PaymentProvider,
        });
      } catch (err) {
        console.error('[Sahovat] Failed to create recurring subscription:', err);
      }
    }

    setStep('success');
  }, [formData, campaignId]);

  const handleDonateAgain = useCallback(() => {
    resetFlow();
  }, [resetFlow]);

  // Step titles
  const stepTitle: Record<DonationStep, string> = {
    amount: t('donate'),
    otp: t('otpRequired'),
    card: t('selectPaymentMethod'),
    confirm: t('confirmDonation'),
    success: t('successTitle'),
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto rounded-t-2xl px-4 pb-8 pt-4 sm:mx-auto sm:max-w-lg"
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="text-center text-base">{stepTitle[step]}</SheetTitle>
          </SheetHeader>

          {/* Amount step */}
          {step === 'amount' && (
            <DonationAmountStep
              campaignTitle={campaignTitle}
              userDisplayName={userDisplayName}
              verificationStatus={verificationStatus}
              onNext={handleAmountNext}
            />
          )}

          {/* OTP step — the dialog renders on top, sheet stays open but shows nothing for this step */}
          {step === 'otp' && (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">{t('otpDescription')}</p>
            </div>
          )}

          {/* Card selection step */}
          {step === 'card' && formData && (
            <SavedCardSelect
              onCardSelected={handleCardSelected}
              onBack={() => setStep(formData.amount > OTP_THRESHOLD ? 'amount' : 'amount')}
            />
          )}

          {/* Confirm step */}
          {step === 'confirm' && formData && (
            <DonationConfirmStep
              campaignId={campaignId}
              campaignTitle={campaignTitle}
              formData={formData}
              savedCardId={selectedCardId}
              platformFeePct={platformFeePct}
              onSuccess={handlePaymentSuccess}
              onBack={() => setStep('card')}
            />
          )}

          {/* Success step */}
          {step === 'success' && formData && completedDonationId && (
            <DonationSuccessStep
              donationId={completedDonationId}
              campaignTitle={campaignTitle}
              amount={formData.amount}
              isRecurring={formData.isRecurring}
              recurringFrequency={formData.recurringFrequency}
              onDonateAgain={handleDonateAgain}
              onClose={handleClose}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* OTP Dialog rendered on top of the sheet */}
      <OtpDialog
        isOpen={step === 'otp'}
        onClose={handleOtpClose}
        onSubmit={handleOtpSubmit}
        title={t('otpRequired')}
        description={t('otpDescription')}
        error={otpError}
        isSubmitting={otpSubmitting}
        countdown={otpCountdown}
        onResend={handleOtpResend}
        isResending={otpResending}
      />
    </>
  );
}
