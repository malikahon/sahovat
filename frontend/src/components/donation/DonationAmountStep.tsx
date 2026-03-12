'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { formatUZS } from '@/lib/formatters';

// ============================================================
// Types
// ============================================================

export interface DonationFormData {
  amount: number;
  isAnonymous: boolean;
  displayName: string;
  note: string;
  isRecurring: boolean;
  recurringFrequency: 'weekly' | 'monthly' | null;
}

interface Props {
  campaignTitle: string;
  userDisplayName: string | null;
  onNext: (data: DonationFormData) => void;
}

// ============================================================
// Preset amount chips
// ============================================================

const PRESET_AMOUNTS = [10_000, 50_000, 100_000, 500_000];
const OTP_THRESHOLD = 100_000;
const MIN_AMOUNT = 1_000;

// ============================================================
// Component
// ============================================================

export function DonationAmountStep({ campaignTitle, userDisplayName, onNext }: Props) {
  const t = useTranslations('donations');

  const [selectedPreset, setSelectedPreset] = useState<number | null>(50_000);
  const [customAmount, setCustomAmount] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [displayName, setDisplayName] = useState(userDisplayName ?? '');
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [error, setError] = useState('');

  const amount = customAmount
    ? parseInt(customAmount.replace(/\D/g, ''), 10) || 0
    : (selectedPreset ?? 0);

  const handlePresetClick = (preset: number) => {
    setSelectedPreset(preset);
    setCustomAmount('');
    setError('');
  };

  const handleCustomChange = (val: string) => {
    // Only digits
    const digits = val.replace(/\D/g, '');
    setCustomAmount(digits);
    setSelectedPreset(null);
    setError('');
  };

  const handleSubmit = () => {
    if (amount < MIN_AMOUNT) {
      setError(t('minimumAmount'));
      return;
    }
    onNext({
      amount,
      isAnonymous,
      displayName: displayName.trim(),
      note: note.trim(),
      isRecurring,
      recurringFrequency: isRecurring ? recurringFrequency : null,
    });
  };

  const needsOtp = amount > OTP_THRESHOLD;

  return (
    <div className="space-y-5">
      {/* Campaign name reminder */}
      <p className="text-sm text-muted-foreground">
        {t('campaign')}: <span className="font-medium text-foreground">{campaignTitle}</span>
      </p>

      {/* Preset chips */}
      <div>
        <Label className="mb-2 block text-sm font-medium">{t('amount')}</Label>
        <div className="grid grid-cols-4 gap-2">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                selectedPreset === preset && !customAmount
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground hover:bg-muted'
              }`}
            >
              {new Intl.NumberFormat('uz-UZ').format(preset)}
            </button>
          ))}
        </div>
      </div>

      {/* Custom amount */}
      <div>
        <Label htmlFor="custom-amount" className="mb-1 block text-sm font-medium">
          {t('customAmount')}
        </Label>
        <div className="relative">
          <Input
            id="custom-amount"
            type="text"
            inputMode="numeric"
            value={customAmount ? new Intl.NumberFormat('uz-UZ').format(parseInt(customAmount, 10)) : ''}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder={t('customAmountPlaceholder')}
            className={error ? 'border-destructive' : ''}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            UZS
          </span>
        </div>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>

      {/* OTP notice */}
      {needsOtp && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {t('otpDescription')}
        </div>
      )}

      {/* Anonymous toggle */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="anonymous"
          checked={isAnonymous}
          onCheckedChange={(checked) => setIsAnonymous(checked === true)}
          className="mt-0.5"
        />
        <div>
          <Label htmlFor="anonymous" className="cursor-pointer text-sm font-medium">
            {t('anonymous')}
          </Label>
          <p className="text-xs text-muted-foreground">{t('anonymousHint')}</p>
        </div>
      </div>

      {/* Display name (shown when not anonymous) */}
      {!isAnonymous && (
        <div>
          <Label htmlFor="display-name" className="mb-1 block text-sm font-medium">
            {t('displayName')}
          </Label>
          <Input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('displayNamePlaceholder')}
            maxLength={100}
          />
        </div>
      )}

      {/* Note */}
      <div>
        <Label htmlFor="donation-note" className="mb-1 block text-sm font-medium">
          {t('note')}
        </Label>
        <Textarea
          id="donation-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('notePlaceholder')}
          rows={2}
          maxLength={500}
          className="resize-none"
        />
      </div>

      {/* Recurring toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="recurring-toggle" className="cursor-pointer text-sm font-medium">
              {t('makeRecurring')}
            </Label>
          </div>
          <Switch
            id="recurring-toggle"
            checked={isRecurring}
            onCheckedChange={(checked) => setIsRecurring(checked === true)}
          />
        </div>

        {isRecurring && (
          <RadioGroup
            value={recurringFrequency}
            onValueChange={(value) => setRecurringFrequency(value as 'weekly' | 'monthly')}
            className="flex gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="weekly" id="freq-weekly" />
              <Label htmlFor="freq-weekly" className="cursor-pointer text-sm">
                {t('recurringWeekly')}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="monthly" id="freq-monthly" />
              <Label htmlFor="freq-monthly" className="cursor-pointer text-sm">
                {t('recurringMonthly')}
              </Label>
            </div>
          </RadioGroup>
        )}
      </div>

      {/* Selected amount summary */}
      {amount > 0 && (
        <div className="rounded-lg bg-muted px-4 py-3 text-sm">
          <span className="text-muted-foreground">{t('donationAmount')}: </span>
          <span className="font-semibold text-foreground">{formatUZS(amount)}</span>
        </div>
      )}

      {/* CTA */}
      <Button className="w-full" size="lg" onClick={handleSubmit} disabled={amount < MIN_AMOUNT}>
        {t('continue')}
      </Button>
    </div>
  );
}
