'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { donationsApi } from '@/lib/api';
import { formatUZS } from '@/lib/formatters';
import type { DonationFormData } from './DonationAmountStep';

interface Props {
  campaignId: string;
  campaignTitle: string;
  formData: DonationFormData;
  platformFeePct?: number; // Fetched from admin settings; defaults to 1%
  onSuccess: (donationId: string) => void;
  onBack: () => void;
}

const DEFAULT_PLATFORM_FEE_PCT = 1; // 1% fallback
const IS_DEV = process.env.NODE_ENV === 'development';

export function DonationConfirmStep({
  campaignId,
  campaignTitle,
  formData,
  platformFeePct,
  onSuccess,
  onBack,
}: Props) {
  const t = useTranslations('donations');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingDonationId, setPendingDonationId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const feePct = platformFeePct ?? DEFAULT_PLATFORM_FEE_PCT;
  const platformFee = Math.round(formData.amount * feePct / 100);
  const netAmount = formData.amount - platformFee;

  const handleInitiate = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await donationsApi.initiate({
        campaign_id: campaignId,
        amount: formData.amount,
        payment_provider: 'payme' as import('@/lib/types').PaymentProvider,
        is_anonymous: formData.isAnonymous,
        donor_display_name: formData.isAnonymous ? undefined : formData.displayName || undefined,
        note: formData.note || undefined,
      });

      if (!res.success || !res.data) {
        setError(res.error || t('errors.initiateFailed'));
        return;
      }

      const { donation, checkout_url } = res.data;
      setPendingDonationId(donation.id);
      setCheckoutUrl(checkout_url);

      if (!IS_DEV) {
        // Production: redirect to PayMe
        window.location.href = checkout_url;
      }
    } catch {
      setError(t('errors.initiateFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!pendingDonationId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await donationsApi.simulatePayment(pendingDonationId, formData.amount);
      if (res.success) {
        onSuccess(pendingDonationId);
      } else {
        setError(res.error || t('errors.paymentFailed'));
      }
    } catch {
      setError(t('errors.paymentFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Summary card */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{t('summary')}</h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('campaign')}</span>
            <span className="font-medium text-foreground max-w-[55%] text-right">{campaignTitle}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('donationAmount')}</span>
            <span className="font-medium text-foreground">{formatUZS(formData.amount)}</span>
          </div>

          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t('platformFee')}</span>
            <span className="text-muted-foreground">− {formatUZS(platformFee)}</span>
          </div>

          <Separator />

          <div className="flex justify-between font-semibold">
            <span className="text-foreground">{t('netAmount')}</span>
            <span className="text-foreground">{formatUZS(netAmount)}</span>
          </div>
        </div>

        {formData.isRecurring && formData.recurringFrequency && (
          <div className="rounded-md bg-primary/10 px-3 py-1.5 text-xs text-primary font-medium">
            {t('recurringConfirm', {
              frequency: formData.recurringFrequency === 'weekly'
                ? t('recurringWeekly').toLowerCase()
                : t('recurringMonthly').toLowerCase(),
            })}
          </div>
        )}

        {formData.isAnonymous && (
          <div className="rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground">
            {t('anonymous')} — {t('anonymousHint')}
          </div>
        )}

        {!formData.isAnonymous && formData.displayName && (
          <div className="text-xs text-muted-foreground">
            {t('displayName')}: <span className="font-medium text-foreground">{formData.displayName}</span>
          </div>
        )}

        {formData.note && (
          <div className="rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground italic">
            "{formData.note}"
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Payment method */}
      <div className="text-xs text-muted-foreground">
        <span className="font-medium">{t('paymentMethod')}:</span> PayMe
        {!pendingDonationId && (
          <p className="mt-1">{t('paymeRedirect')}</p>
        )}
      </div>

      {/* Step 1: Initiate donation (get checkout URL) */}
      {!pendingDonationId && (
        <>
          <Button
            className="w-full"
            size="lg"
            onClick={handleInitiate}
            disabled={isLoading}
          >
            {isLoading ? t('processing') : t('confirmAndPay')}
          </Button>
          <button
            type="button"
            onClick={onBack}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← {t('close')}
          </button>
        </>
      )}

      {/* Step 2 (dev mode): Simulate payment */}
      {pendingDonationId && IS_DEV && (
        <div className="space-y-3">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <strong>Dev Mode</strong> — checkout URL: <code className="break-all">{checkoutUrl}</code>
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={handleSimulatePayment}
            disabled={isLoading}
          >
            {isLoading ? t('processing') : t('simulatePayment')}
          </Button>
        </div>
      )}

      {/* Step 2 (prod mode): redirect happened — show waiting state */}
      {pendingDonationId && !IS_DEV && (
        <div className="text-center text-sm text-muted-foreground">
          {t('processing')}
        </div>
      )}
    </div>
  );
}
