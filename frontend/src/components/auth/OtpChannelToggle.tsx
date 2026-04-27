'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Phone, Send } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { OtpChannel } from '@/lib/types';

const STORAGE_KEY = 'preferred_otp_channel';

interface OtpChannelToggleProps {
  /** Controlled value from parent */
  value: OtpChannel;
  /** Called when the user picks a different channel */
  onChange: (channel: OtpChannel) => void;
  /** Disable interaction (e.g. during submission) */
  disabled?: boolean;
}

/**
 * Reads the user's previously chosen OTP channel from localStorage.
 * Returns 'sms' as a safe default.
 */
export function getStoredOtpChannel(): OtpChannel {
  if (typeof window === 'undefined') return 'sms';
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'telegram' ? 'telegram' : 'sms';
  } catch {
    return 'sms';
  }
}

/**
 * Persists the user's OTP channel choice to localStorage.
 */
function storeOtpChannel(channel: OtpChannel): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, channel);
  } catch {
    // localStorage might be disabled (private mode); silently ignore.
  }
}

/**
 * Segmented two-tab control letting the user choose between SMS OTP
 * and Telegram Login Widget on the /login page. The choice is
 * persisted in localStorage and rehydrated next session.
 */
export function OtpChannelToggle({
  value,
  onChange,
  disabled = false,
}: OtpChannelToggleProps) {
  const t = useTranslations('auth.otpChannel');
  const [hydrated, setHydrated] = useState(false);

  // Rehydrate from localStorage on first client render. Defer the parent
  // notification by one tick so we don't fight the initial render.
  useEffect(() => {
    setHydrated(true);
    const stored = getStoredOtpChannel();
    if (stored !== value) {
      onChange(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(next: string | number) {
    const channel = next === 'telegram' ? 'telegram' : 'sms';
    storeOtpChannel(channel);
    onChange(channel);
  }

  return (
    <Tabs
      value={hydrated ? value : 'sms'}
      onValueChange={handleChange}
      className="w-full"
      aria-label={t('tabLabel')}
    >
      <TabsList className="w-full">
        <TabsTrigger value="sms" disabled={disabled}>
          <Phone className="size-4" />
          {t('sms')}
        </TabsTrigger>
        <TabsTrigger value="telegram" disabled={disabled}>
          <Send className="size-4" />
          {t('telegram')}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
