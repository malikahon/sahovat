'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { PaymentProvider } from '@/lib/types';

interface Props {
  value: PaymentProvider;
  onChange: (provider: PaymentProvider) => void;
}

const STORAGE_KEY = 'preferred_payment_provider';

export function ProviderSelector({ value, onChange }: Props) {
  const t = useTranslations('donations');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as PaymentProvider | null;
    if (saved === 'payme' || saved === 'click') {
      onChange(saved);
    }
  }, [onChange]);

  const handleChange = (provider: PaymentProvider) => {
    onChange(provider);
    localStorage.setItem(STORAGE_KEY, provider);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{t('chooseProvider')}</Label>
      <RadioGroup
        value={value}
        onValueChange={(v) => handleChange(v as PaymentProvider)}
        className="grid grid-cols-2 gap-3"
      >
        <Label
          htmlFor="provider-payme"
          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
            value === 'payme'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:bg-muted'
          }`}
        >
          <RadioGroupItem value="payme" id="provider-payme" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">PayMe</span>
            <span className="text-xs text-muted-foreground">{t('paymeDescription')}</span>
          </div>
        </Label>

        <Label
          htmlFor="provider-click"
          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
            value === 'click'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:bg-muted'
          }`}
        >
          <RadioGroupItem value="click" id="provider-click" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Click</span>
            <span className="text-xs text-muted-foreground">{t('clickDescription')}</span>
          </div>
        </Label>
      </RadioGroup>
    </div>
  );
}