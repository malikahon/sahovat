'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { savedCardsApi } from '@/lib/api';

interface Props {
  onCardCreated: (cardId: string, phoneMasked: string, wait: number) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

/**
 * Card number and expiry input form.
 * Submits to backend which calls PayMe cards.create + cards.get_verify_code.
 */
export function CardForm({ onCardCreated, onCancel, isLoading: externalLoading }: Props) {
  const t = useTranslations('savedCards');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpire, setCardExpire] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loading = isLoading || externalLoading;

  // Format card number with spaces: 8600 1234 5678 9012
  const handleCardNumberChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
    setError('');
  };

  // Format expire as MM/YY
  const handleExpireChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      setCardExpire(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setCardExpire(digits);
    }
    setError('');
  };

  const rawCardNumber = cardNumber.replace(/\s/g, '');
  const rawExpire = cardExpire.replace('/', '');

  const isUzcard = rawCardNumber.startsWith('8600');
  const isHumo = rawCardNumber.startsWith('9860');
  const cardTypeLabel = isUzcard ? 'Uzcard' : isHumo ? 'Humo' : '';

  const isValid = rawCardNumber.length === 16 && rawExpire.length === 4;

  const handleSubmit = async () => {
    if (!isValid) return;
    setIsLoading(true);
    setError('');

    try {
      const res = await savedCardsApi.create(rawCardNumber, rawExpire);
      if (res.success && res.data) {
        onCardCreated(res.data.card_id, res.data.phone_masked, res.data.wait);
      } else {
        setError(res.error || t('errors.addFailed'));
      }
    } catch {
      setError(t('errors.addFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="card-number" className="mb-1 block text-sm font-medium">
          {t('cardNumber')}
        </Label>
        <div className="relative">
          <Input
            id="card-number"
            type="text"
            inputMode="numeric"
            value={cardNumber}
            onChange={(e) => handleCardNumberChange(e.target.value)}
            placeholder="8600 0000 0000 0000"
            maxLength={19}
            className={error ? 'border-destructive' : ''}
            disabled={loading}
          />
          {cardTypeLabel && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted-foreground">
              {cardTypeLabel}
            </span>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="card-expire" className="mb-1 block text-sm font-medium">
          {t('cardExpire')}
        </Label>
        <Input
          id="card-expire"
          type="text"
          inputMode="numeric"
          value={cardExpire}
          onChange={(e) => handleExpireChange(e.target.value)}
          placeholder="MM/YY"
          maxLength={5}
          className="w-32"
          disabled={loading}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          className="flex-1"
          onClick={handleSubmit}
          disabled={!isValid || loading}
        >
          {loading ? t('processing') : t('addCard')}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {t('cancel')}
          </Button>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground leading-tight">
        {t('cardSecurityNotice')}
      </p>
    </div>
  );
}
