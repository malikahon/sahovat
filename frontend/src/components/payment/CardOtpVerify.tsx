'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { savedCardsApi } from '@/lib/api';
import type { SavedCard } from '@/lib/types';

interface Props {
  cardId: string;
  phoneMasked: string;
  waitMs: number;
  onVerified: (card: SavedCard) => void;
  onCancel?: () => void;
}

/**
 * OTP verification step for card add flow.
 * The user enters the 6-digit code sent to their phone.
 */
export function CardOtpVerify({ cardId, phoneMasked, waitMs, onVerified, onCancel }: Props) {
  const t = useTranslations('savedCards');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(Math.floor(waitMs / 1000));

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleCodeChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setError('');
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setIsLoading(true);
    setError('');

    try {
      const res = await savedCardsApi.verify(cardId, code);
      if (res.success && res.data) {
        onVerified(res.data);
      } else {
        setError(res.error || t('errors.verifyFailed'));
      }
    } catch {
      setError(t('errors.verifyFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
        {t('otpSentTo', { phone: phoneMasked })}
      </div>

      <div>
        <Label htmlFor="card-otp" className="mb-1 block text-sm font-medium">
          {t('enterOtp')}
        </Label>
        <Input
          id="card-otp"
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          placeholder="000000"
          maxLength={6}
          className={`text-center text-lg tracking-widest ${error ? 'border-destructive' : ''}`}
          disabled={isLoading}
          autoFocus
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {countdown > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {t('otpExpiresIn', { seconds: countdown })}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          className="flex-1"
          onClick={handleVerify}
          disabled={code.length !== 6 || isLoading}
        >
          {isLoading ? t('processing') : t('verifyCard')}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            {t('cancel')}
          </Button>
        )}
      </div>
    </div>
  );
}
