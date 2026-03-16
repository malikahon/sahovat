'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { donationsApi } from '@/lib/api';
import { formatUZS } from '@/lib/formatters';

interface Props {
  campaignId: string;
  amount: number;
  onVerified: () => void;
  onBack: () => void;
}

const RESEND_COOLDOWN = 60; // seconds

export function DonationOtpStep({ campaignId, amount, onVerified, onBack }: Props) {
  const t = useTranslations('donations');

  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [hasSent, setHasSent] = useState(false);

  // Send OTP on mount
  const sendOtp = useCallback(async () => {
    setIsSending(true);
    setError('');
    try {
      const res = await donationsApi.requestOtp(campaignId, amount);
      if (!res.success) {
        setError(res.error || t('errors.otpFailed'));
      } else {
        setHasSent(true);
        setCooldown(RESEND_COOLDOWN);
      }
    } catch {
      setError(t('errors.otpFailed'));
    } finally {
      setIsSending(false);
    }
  }, [campaignId, amount, t]);

  useEffect(() => {
    sendOtp();
  }, [sendOtp]);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setIsVerifying(true);
    setError('');
    try {
      const res = await donationsApi.verifyOtp(otp);
      if (res.success) {
        onVerified();
      } else {
        setError(t('otpInvalid'));
        setOtp('');
      }
    } catch {
      setError(t('otpInvalid'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOtpChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    setError('');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-foreground">{t('otpRequired')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('otpDescription')}
        </p>
        <p className="mt-2 text-sm font-medium text-foreground">
          {t('donationAmount')}: {formatUZS(amount)}
        </p>
      </div>

      {hasSent && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
          {t('otpSent')}
        </div>
      )}

      {/* OTP Input */}
      <div>
        <Label htmlFor="otp-input" className="mb-1 block text-sm font-medium">
          {t('otpCode')}
        </Label>
        <Input
          id="otp-input"
          type="text"
          inputMode="numeric"
          value={otp}
          onChange={(e) => handleOtpChange(e.target.value)}
          placeholder="000000"
          maxLength={6}
          className={`text-center text-xl tracking-widest font-mono ${error ? 'border-destructive' : ''}`}
          autoComplete="one-time-code"
        />
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>

      {/* Verify button */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleVerify}
        disabled={otp.length !== 6 || isVerifying}
      >
        {isVerifying ? t('processing') : t('otpVerify')}
      </Button>

      {/* Resend */}
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          ← {t('close')}
        </button>
        <button
          type="button"
          onClick={() => { setOtp(''); sendOtp(); }}
          disabled={cooldown > 0 || isSending}
          className="text-primary disabled:text-muted-foreground hover:underline disabled:no-underline disabled:cursor-default"
        >
          {cooldown > 0
            ? t('otpResendIn', { seconds: cooldown })
            : isSending
              ? t('processing')
              : t('otpResend')}
        </button>
      </div>
    </div>
  );
}
