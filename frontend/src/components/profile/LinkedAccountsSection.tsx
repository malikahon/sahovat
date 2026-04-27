'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Phone, Send, Mail, CheckCircle2, AlertCircle, Loader2, Link2Off } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { TelegramLoginButton } from '@/components/auth/TelegramLoginButton';
import { EmailRow } from './EmailRow';
import type { TelegramAuthPayload } from '@/lib/types';

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'SahovatTechBot';

/**
 * "Linked Accounts" section of /profile.
 *
 * Shows three rows: Phone (read-only), Telegram (link/unlink), Email
 * (add/verify/edit — implemented in EmailRow).
 *
 * Telegram link reuses the official Login Widget. Telegram unlink is
 * blocked by the backend if it would leave the account with no
 * authentication method (no phone AND no password).
 */
export function LinkedAccountsSection() {
  const t = useTranslations('profile.linkedAccounts');
  const tCommon = useTranslations('common');
  const { user, telegramLink, telegramUnlink } = useAuth();

  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [unlinkBusy, setUnlinkBusy] = useState(false);

  if (!user) return null;

  // Mask phone for display: +998 XX XXX XX XX → +998 ** *** ** **
  function formatPhone(phone: string): string {
    if (phone.length < 13) return phone;
    return `${phone.slice(0, 4)} ${phone.slice(4, 6)} ${phone.slice(6, 9)} ${phone.slice(9, 11)} ${phone.slice(11)}`;
  }

  function formatDate(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString();
  }

  async function handleTelegramLink(payload: TelegramAuthPayload) {
    setLinkBusy(true);
    setLinkError(null);
    setLinkSuccess(null);
    try {
      await telegramLink(payload);
      setLinkSuccess(t('telegram.linkSuccess'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('telegram.linkError');
      setLinkError(msg);
    } finally {
      setLinkBusy(false);
    }
  }

  async function handleTelegramUnlinkConfirm() {
    setUnlinkBusy(true);
    setLinkError(null);
    setLinkSuccess(null);
    try {
      await telegramUnlink();
      setLinkSuccess(t('telegram.unlinkSuccess'));
      setUnlinkOpen(false);
    } catch (err) {
      // Surface the orphan-account guard cleanly.
      const msg = err instanceof Error ? err.message : t('telegram.unlinkError');
      // Backend returns code WOULD_ORPHAN_ACCOUNT in the error message.
      if (msg.toLowerCase().includes('cannot unlink')) {
        setLinkError(t('telegram.wouldOrphan'));
      } else {
        setLinkError(msg);
      }
      setUnlinkOpen(false);
    } finally {
      setUnlinkBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ── Phone row ───────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Phone className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">{t('phone.label')}</div>
              <div className="truncate text-sm text-muted-foreground">
                {user.phone_number ? formatPhone(user.phone_number) : t('phone.none')}
              </div>
            </div>
          </div>
        </div>

        {/* ── Telegram row ────────────────────────────────── */}
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-sky-100 text-sky-700">
              <Send className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">{t('telegram.label')}</div>
              {user.telegram_id ? (
                <div className="truncate text-sm text-muted-foreground">
                  {user.telegram_username ? `@${user.telegram_username}` : `ID ${user.telegram_id}`}
                  {user.telegram_linked_at && (
                    <span className="ml-2 text-xs">
                      · {t('telegram.linkedAt', { date: formatDate(user.telegram_linked_at) })}
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">—</div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {user.telegram_id ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUnlinkOpen(true)}
                disabled={unlinkBusy}
              >
                <Link2Off className="size-3.5" />
                {t('telegram.unlinkButton')}
              </Button>
            ) : linkBusy ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
              </div>
            ) : (
              <TelegramLoginButton
                botUsername={TELEGRAM_BOT_USERNAME}
                size="medium"
                showUserPhoto={false}
                onAuth={handleTelegramLink}
              />
            )}
          </div>
        </div>

        {/* ── Telegram messages ────────────────────────────── */}
        {linkSuccess && (
          <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <div>{linkSuccess}</div>
          </div>
        )}
        {linkError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>{linkError}</div>
          </div>
        )}

        {/* ── Email row ──────────────────────────────────── */}
        <EmailRow />

        {/* Helper note about email */}
        <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          <Mail className="mt-0.5 size-3.5 shrink-0" />
          <span className="sr-only">{t('emailHelperNote')}</span>
        </div>
      </CardContent>

      {/* ── Unlink confirmation dialog ───────────────────── */}
      <Dialog open={unlinkOpen} onOpenChange={(open) => !unlinkBusy && setUnlinkOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('telegram.unlinkConfirmTitle')}</DialogTitle>
            <DialogDescription>{t('telegram.unlinkConfirmDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setUnlinkOpen(false)}
              disabled={unlinkBusy}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleTelegramUnlinkConfirm}
              disabled={unlinkBusy}
            >
              {unlinkBusy ? <Loader2 className="size-4 animate-spin" /> : <Link2Off className="size-4" />}
              {t('telegram.unlinkConfirmCta')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
