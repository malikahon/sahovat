'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { CreditCard, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { savedCardsApi } from '@/lib/api';
import type { SavedCard } from '@/lib/types';
import { CardForm } from '@/components/payment/CardForm';
import { OtpDialog } from '@/components/shared/OtpDialog';

type PageStep = 'list' | 'add_card' | 'verify_otp';

export default function PaymentMethodsPage() {
  const t = useTranslations('savedCards');
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<PageStep>('list');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  // OTP state
  const [pendingCardId, setPendingCardId] = useState('');
  const [phoneMasked, setPhoneMasked] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(60);

  // Countdown timer
  useEffect(() => {
    if (step !== 'verify_otp' || otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [step, otpCountdown]);

  const loadCards = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await savedCardsApi.list();
      if (res.success && res.data) {
        setCards(res.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleRemove = async (cardId: string) => {
    setActionLoading(cardId);
    setError('');
    try {
      const res = await savedCardsApi.remove(cardId);
      if (res.success) {
        setCards((prev) => prev.filter((c) => c.id !== cardId));
      } else {
        setError(res.error || t('errors.removeFailed'));
      }
    } catch {
      setError(t('errors.removeFailed'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetDefault = async (cardId: string) => {
    setActionLoading(cardId);
    setError('');
    try {
      const res = await savedCardsApi.setDefault(cardId);
      if (res.success) {
        setCards((prev) =>
          prev.map((c) => ({
            ...c,
            is_default: c.id === cardId,
          })),
        );
      } else {
        setError(res.error || t('errors.defaultFailed'));
      }
    } catch {
      setError(t('errors.defaultFailed'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCardCreated = (cardId: string, phone: string, wait: number) => {
    setPendingCardId(cardId);
    setPhoneMasked(phone);
    setOtpError(null);
    setOtpCountdown(Math.floor(wait / 1000));
    setStep('verify_otp');
  };

  const handleOtpSubmit = useCallback(async (code: string) => {
    setOtpSubmitting(true);
    setOtpError(null);
    try {
      const res = await savedCardsApi.verify(pendingCardId, code);
      if (res.success && res.data) {
        setCards((prev) => [...prev, res.data!]);
        setStep('list');
      } else {
        setOtpError(res.error || t('errors.verifyFailed'));
      }
    } catch {
      setOtpError(t('errors.verifyFailed'));
    } finally {
      setOtpSubmitting(false);
    }
  }, [pendingCardId, t]);

  const handleOtpClose = useCallback(() => {
    setStep('list');
  }, []);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>
        <div className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        {step === 'list' && (
          <Button size="sm" onClick={() => setStep('add_card')}>
            {t('addCard')}
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Add card form */}
      {step === 'add_card' && (
        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <h2 className="text-sm font-semibold mb-4">{t('addNewCard')}</h2>
          <CardForm
            onCardCreated={handleCardCreated}
            onCancel={() => setStep('list')}
          />
        </div>
      )}

      {/* Card list */}
      {step === 'list' && cards.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <CreditCard className="mx-auto mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">{t('noCards')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('noCardsDescription')}</p>
          <Button size="sm" className="mt-4" onClick={() => setStep('add_card')}>
            {t('addFirstCard')}
          </Button>
        </div>
      )}

      {step === 'list' && cards.length > 0 && (
        <div className="space-y-3">
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3"
            >
              <CreditCard className="size-8 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {card.card_number_masked}
                </p>
                <p className="text-xs text-muted-foreground">
                  {card.card_type.toUpperCase()} &middot; {card.card_expire}
                  {card.is_default && (
                    <span className="ml-1 text-primary font-medium">&middot; {t('default')}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {!card.is_default && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => handleSetDefault(card.id)}
                    disabled={actionLoading === card.id}
                    title={t('makeDefault')}
                  >
                    <Star className="size-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => handleRemove(card.id)}
                  disabled={actionLoading === card.id}
                  title={t('removeCard')}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OTP Dialog for card verification */}
      <OtpDialog
        isOpen={step === 'verify_otp'}
        onClose={handleOtpClose}
        onSubmit={handleOtpSubmit}
        title={t('verifyCard')}
        description={t('otpSentTo', { phone: phoneMasked })}
        error={otpError}
        isSubmitting={otpSubmitting}
        countdown={otpCountdown}
        onResend={handleOtpClose} // No resend API for card OTP; go back
        isResending={false}
      />
    </div>
  );
}
