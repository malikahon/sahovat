'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { CreditCard, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { savedCardsApi } from '@/lib/api';
import type { SavedCard } from '@/lib/types';
import { CardForm } from './CardForm';
import { OtpDialog } from '@/components/shared/OtpDialog';

type CardStep = 'select' | 'add_card' | 'verify_otp';

interface Props {
  onCardSelected: (cardId: string) => void;
  onBack?: () => void;
}

const RESEND_COOLDOWN = 60;

/**
 * Card selection step in the donation flow.
 * Shows saved cards as a radio list + "Add new card" option.
 * If no cards exist, goes straight to the card add flow.
 */
export function SavedCardSelect({ onCardSelected, onBack }: Props) {
  const t = useTranslations('savedCards');
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<CardStep>('select');

  // OTP state
  const [pendingCardId, setPendingCardId] = useState('');
  const [phoneMasked, setPhoneMasked] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(RESEND_COOLDOWN);

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
        const defaultCard = res.data.find((c) => c.is_default);
        setSelectedId(defaultCard?.id ?? res.data[0]?.id ?? null);

        // If no cards, go straight to add
        if (res.data.length === 0) {
          setStep('add_card');
        }
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
        setSelectedId(res.data.id);
        setStep('select');
        // Auto-proceed with the newly verified card
        onCardSelected(res.data.id);
      } else {
        setOtpError(res.error || t('errors.verifyFailed'));
      }
    } catch {
      setOtpError(t('errors.verifyFailed'));
    } finally {
      setOtpSubmitting(false);
    }
  }, [pendingCardId, onCardSelected, t]);

  const handleOtpClose = useCallback(() => {
    setStep('add_card');
  }, []);

  const handleConfirm = () => {
    if (selectedId) {
      onCardSelected(selectedId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Step: Add new card
  if (step === 'add_card') {
    return (
      <CardForm
        onCardCreated={handleCardCreated}
        onCancel={cards.length > 0 ? () => setStep('select') : onBack}
      />
    );
  }

  // Step: Verify OTP (dialog renders on top)
  if (step === 'verify_otp') {
    return (
      <>
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">
            {t('otpSentTo', { phone: phoneMasked })}
          </p>
        </div>
        <OtpDialog
          isOpen
          onClose={handleOtpClose}
          onSubmit={handleOtpSubmit}
          title={t('verifyCard')}
          description={t('otpSentTo', { phone: phoneMasked })}
          error={otpError}
          isSubmitting={otpSubmitting}
          countdown={otpCountdown}
          onResend={handleOtpClose} // No resend API for card OTP; go back to re-add
          isResending={false}
        />
      </>
    );
  }

  // Step: Select from saved cards
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('selectCard')}</p>

      <div className="space-y-2">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => setSelectedId(card.id)}
            className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
              selectedId === card.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted/50'
            }`}
          >
            <CreditCard className={`size-5 ${selectedId === card.id ? 'text-primary' : 'text-muted-foreground'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {card.card_number_masked}
              </p>
              <p className="text-xs text-muted-foreground">
                {card.card_type.toUpperCase()} &middot; {card.card_expire}
                {card.is_default && ` &middot; ${t('default')}`}
              </p>
            </div>
            <div className={`size-4 rounded-full border-2 ${
              selectedId === card.id
                ? 'border-primary bg-primary'
                : 'border-muted-foreground/30'
            }`}>
              {selectedId === card.id && (
                <div className="m-0.5 size-2 rounded-full bg-white" />
              )}
            </div>
          </button>
        ))}

        {/* Add new card button */}
        <button
          type="button"
          onClick={() => setStep('add_card')}
          className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border px-4 py-3 text-left transition-colors hover:bg-muted/50"
        >
          <Plus className="size-5 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">{t('addNewCard')}</span>
        </button>
      </div>

      <Button
        className="w-full"
        onClick={handleConfirm}
        disabled={!selectedId}
      >
        {t('continueWithCard')}
      </Button>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {t('back')}
        </button>
      )}
    </div>
  );
}
