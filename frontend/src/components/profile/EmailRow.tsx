'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, CheckCircle2, AlertCircle, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OtpDialog } from '@/components/shared/OtpDialog';
import { useAuth } from '@/hooks/useAuth';
import { usersApi } from '@/lib/api';

const RESEND_COOLDOWN = 60;

const emailFormSchema = z.object({
  email: z.string().email(),
});

type EmailFormData = z.infer<typeof emailFormSchema>;

/**
 * Email row in the Linked Accounts section.
 *
 * Three states:
 *   1. No email      → "Add email" → opens edit dialog → PATCH email
 *   2. Has email, unverified → email + amber + "Send verification code"
 *      → POST verify-request → opens OtpDialog → POST verify-confirm
 *   3. Has email, verified   → email + green check
 *
 * Editing an already-verified email returns the row to state 2 since
 * the backend automatically clears email_verified_at on PATCH.
 */
export function EmailRow() {
  const t = useTranslations('profile.linkedAccounts.email');
  const tCommon = useTranslations('common');
  const { user, refreshUser } = useAuth();

  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [verifyCountdown, setVerifyCountdown] = useState(0);
  const [verifyResending, setVerifyResending] = useState(false);
  const [requestingCode, setRequestingCode] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { email: '' },
  });

  if (!user) return null;

  function formatDate(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString();
  }

  const hasEmail = !!user.email;
  const isVerified = !!user.email_verified_at;

  function openEditDialog() {
    setEditError(null);
    reset({ email: user?.email ?? '' });
    setEditOpen(true);
  }

  async function onEditSubmit(data: EmailFormData) {
    setEditError(null);
    const result = await usersApi.updateEmail(data.email);
    if (!result.success) {
      if (result.error === 'EMAIL_TAKEN') {
        setEditError(t('alreadyTaken'));
      } else {
        setEditError(result.message || result.error || t('saveError'));
      }
      return;
    }
    await refreshUser();
    setEditOpen(false);
    setBannerMessage({ kind: 'success', text: t('saveSuccess') });
  }

  /**
   * Triggers the backend to send a 6-digit code to the user's email,
   * then opens the OTP dialog. Starts the resend countdown.
   */
  async function handleSendCode() {
    setBannerMessage(null);
    setVerifyError(null);
    setRequestingCode(true);
    try {
      const result = await usersApi.requestEmailVerification();
      if (!result.success) {
        if (result.error === 'EMAIL_VERIFY_RATE_LIMIT') {
          setBannerMessage({ kind: 'error', text: t('rateLimited') });
          return;
        }
        setBannerMessage({
          kind: 'error',
          text: result.message || result.error || t('verifyError'),
        });
        return;
      }
      // Open the dialog with countdown. The OtpDialog's countdown timer
      // will tick down on its own once we wire useEffect; we keep the
      // logic here for parity with /login.
      setVerifyCountdown(RESEND_COOLDOWN);
      setVerifyOpen(true);
      // Tick the countdown ourselves.
      const interval = setInterval(() => {
        setVerifyCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } finally {
      setRequestingCode(false);
    }
  }

  async function handleVerifySubmit(code: string) {
    setVerifySubmitting(true);
    setVerifyError(null);
    try {
      const result = await usersApi.confirmEmailVerification(code);
      if (!result.success) {
        if (result.error === 'CODE_EXPIRED') {
          setVerifyError(t('codeExpired'));
        } else if (result.error === 'INVALID_CODE') {
          setVerifyError(t('codeInvalid'));
        } else {
          setVerifyError(result.message || result.error || t('verifyError'));
        }
        return;
      }
      await refreshUser();
      setVerifyOpen(false);
      setBannerMessage({ kind: 'success', text: t('verifySuccess') });
    } finally {
      setVerifySubmitting(false);
    }
  }

  async function handleVerifyResend() {
    if (verifyCountdown > 0 || verifyResending) return;
    setVerifyResending(true);
    setVerifyError(null);
    try {
      const result = await usersApi.requestEmailVerification();
      if (!result.success) {
        if (result.error === 'EMAIL_VERIFY_RATE_LIMIT') {
          setVerifyError(t('rateLimited'));
        } else {
          setVerifyError(result.message || result.error || t('verifyError'));
        }
        return;
      }
      setVerifyCountdown(RESEND_COOLDOWN);
      const interval = setInterval(() => {
        setVerifyCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } finally {
      setVerifyResending(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-violet-100 text-violet-700">
            <Mail className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium">{t('label')}</div>
            {hasEmail ? (
              <>
                <div className="truncate text-sm text-muted-foreground">{user.email}</div>
                {isVerified ? (
                  <div className="mt-1 flex items-center gap-1 text-xs text-green-700">
                    <CheckCircle2 className="size-3.5" />
                    {t('verifiedAt', { date: formatDate(user.email_verified_at) })}
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                    <AlertCircle className="size-3.5" />
                    {t('unverified')}
                  </div>
                )}
              </>
            ) : (
              <div className="text-xs text-muted-foreground">{t('none')}</div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {!hasEmail && (
            <Button variant="default" size="sm" onClick={openEditDialog}>
              <Mail className="size-3.5" />
              {t('addButton')}
            </Button>
          )}
          {hasEmail && !isVerified && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={handleSendCode}
                disabled={requestingCode}
              >
                {requestingCode ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                {t('verifyButton')}
              </Button>
              <Button variant="outline" size="sm" onClick={openEditDialog}>
                {t('editButton')}
              </Button>
            </>
          )}
          {hasEmail && isVerified && (
            <Button variant="outline" size="sm" onClick={openEditDialog}>
              {t('editButton')}
            </Button>
          )}
        </div>
      </div>

      {/* Status banner (success / error from any flow) */}
      {bannerMessage && (
        <div
          className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
            bannerMessage.kind === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-destructive/40 bg-destructive/10 text-destructive'
          }`}
        >
          {bannerMessage.kind === 'success' ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          )}
          <div>{bannerMessage.text}</div>
        </div>
      )}

      {/* ── Edit / Add email dialog ───────────────────────── */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => !isSubmitting && setEditOpen(open)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {hasEmail ? t('editDialogTitle') : t('addDialogTitle')}
            </DialogTitle>
            <DialogDescription>{t('addDialogDescription')}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(onEditSubmit)}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="email">{t('label')}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {editError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {editError}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={isSubmitting}
              >
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {t('saveButton')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Verify email OtpDialog ─────────────────────────── */}
      <OtpDialog
        isOpen={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        onSubmit={handleVerifySubmit}
        title={t('verifyDialogTitle')}
        description={t('verifyDialogDescription', { email: user.email ?? '' })}
        error={verifyError}
        isSubmitting={verifySubmitting}
        countdown={verifyCountdown}
        onResend={handleVerifyResend}
        isResending={verifyResending}
      />
    </>
  );
}
