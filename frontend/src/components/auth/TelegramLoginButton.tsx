'use client';

import { useEffect, useId, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { TelegramAuthPayload } from '@/lib/types';

interface TelegramLoginButtonProps {
  /** Bot username without the leading @ — must match TELEGRAM_BOT_USERNAME on the backend. */
  botUsername: string;
  /** Visual variant: 'login' (large blue button) or 'link' (compact). */
  size?: 'large' | 'medium' | 'small';
  /** Show user photo next to button. */
  showUserPhoto?: boolean;
  /** Theme accent. */
  cornerRadius?: number;
  /** Called with the verified payload from Telegram. */
  onAuth: (payload: TelegramAuthPayload) => void;
  /** Optional className for the wrapping div. */
  className?: string;
}

declare global {
  interface Window {
    [callbackName: string]: unknown;
  }
}

/**
 * Embeds the official Telegram Login Widget script.
 *
 * Telegram's widget script injects an iframe button into the host element.
 * Authentication is delivered to a callback registered on `window` whose
 * name is provided via `data-onauth`. We give every instance a unique
 * callback name so multiple buttons (e.g. login + link in the same SPA)
 * never collide.
 *
 * Requirements (handled in Week 0):
 *   - Bot username must be reserved with @BotFather.
 *   - `/setdomain` must be set to the host serving this page.
 */
export function TelegramLoginButton({
  botUsername,
  size = 'large',
  showUserPhoto = true,
  cornerRadius = 8,
  onAuth,
  className,
}: TelegramLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('auth.telegramLogin');
  const callbackName = `__sahovat_tg_auth_${useId().replace(/[^a-zA-Z0-9_]/g, '_')}`;
  const onAuthRef = useRef(onAuth);

  // Keep the latest handler accessible to the global callback without
  // re-mounting the script (which would flicker the widget).
  useEffect(() => {
    onAuthRef.current = onAuth;
  }, [onAuth]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!botUsername) return;

    // Register the global callback Telegram will invoke.
    window[callbackName] = (data: TelegramAuthPayload) => {
      onAuthRef.current(data);
    };

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', size);
    script.setAttribute('data-userpic', String(showUserPhoto));
    script.setAttribute('data-radius', String(cornerRadius));
    // Ask for write access so the bot can DM the user later (Week 3).
    // Granting it is optional from the user's side.
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', `${callbackName}(user)`);

    containerRef.current.appendChild(script);

    return () => {
      // Clean up the callback so it can't be called after unmount.
      delete window[callbackName];
      // The widget appends an iframe sibling; remove all children so a
      // remount produces a fresh button rather than duplicates.
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botUsername, size, showUserPhoto, cornerRadius, callbackName]);

  if (!botUsername) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        {t('notConfigured')}
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}
