'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { DonationAmountStep, type DonationFormData } from './DonationAmountStep';
import { DonationOtpStep } from './DonationOtpStep';
import { DonationConfirmStep } from './DonationConfirmStep';
import { DonationSuccessStep } from './DonationSuccessStep';
import { recurringApi } from '@/lib/api';

// ============================================================
// Types
// ============================================================

type DonationStep = 'amount' | 'otp' | 'confirm' | 'success';

interface Props {
  campaignId: string;
  campaignTitle: string;
  isOpen: boolean;
  onClose: () => void;
  userDisplayName: string | null;
}

const OTP_THRESHOLD = 100_000;

// ============================================================
// Component
// ============================================================

export function DonationBottomSheet({
  campaignId,
  campaignTitle,
  isOpen,
  onClose,
  userDisplayName,
}: Props) {
  const t = useTranslations('donations');

  const [step, setStep] = useState<DonationStep>('amount');
  const [formData, setFormData] = useState<DonationFormData | null>(null);
  const [completedDonationId, setCompletedDonationId] = useState<string | null>(null);

  const resetFlow = useCallback(() => {
    setStep('amount');
    setFormData(null);
    setCompletedDonationId(null);
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    // Reset after animation completes
    setTimeout(resetFlow, 300);
  }, [onClose, resetFlow]);

  const handleAmountNext = useCallback((data: DonationFormData) => {
    setFormData(data);
    if (data.amount > OTP_THRESHOLD) {
      setStep('otp');
    } else {
      setStep('confirm');
    }
  }, []);

  const handleOtpVerified = useCallback(() => {
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
    confirm: t('confirmDonation'),
    success: t('successTitle'),
  };

  return (
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
            onNext={handleAmountNext}
          />
        )}

        {/* OTP step */}
        {step === 'otp' && formData && (
          <DonationOtpStep
            campaignId={campaignId}
            amount={formData.amount}
            onVerified={handleOtpVerified}
            onBack={() => setStep('amount')}
          />
        )}

        {/* Confirm step */}
        {step === 'confirm' && formData && (
          <DonationConfirmStep
            campaignId={campaignId}
            campaignTitle={campaignTitle}
            formData={formData}
            onSuccess={handlePaymentSuccess}
            onBack={() => setStep(formData.amount > OTP_THRESHOLD ? 'otp' : 'amount')}
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
  );
}
