'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Phone, ArrowRight, Loader2 } from 'lucide-react';
import { OtpDialog } from '@/components/shared/OtpDialog';
import { OtpChannelToggle, getStoredOtpChannel } from '@/components/auth/OtpChannelToggle';
import { TelegramLoginButton } from '@/components/auth/TelegramLoginButton';
import type { OtpChannel, TelegramAuthPayload } from '@/lib/types';

const RESEND_COOLDOWN = 60;

const loginSchema = z.object({
  phone: z
    .string()
    .regex(/^\d{9}$/, 'phoneInvalid'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'SahovatTechBot';

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { login, verifyOtp, telegramLogin } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Channel state: SMS by default; restored from localStorage by OtpChannelToggle.
  const [channel, setChannel] = useState<OtpChannel>('sms');
  const [telegramSubmitting, setTelegramSubmitting] = useState(false);

  // OTP dialog state
  const [showOtp, setShowOtp] = useState(false);
  const [otpPhone, setOtpPhone] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(RESEND_COOLDOWN);
  const [otpResending, setOtpResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '' },
  });

  // Hydrate the channel state from localStorage on mount. Avoids a
  // first-render hydration mismatch by initializing to 'sms'.
  useEffect(() => {
    setChannel(getStoredOtpChannel());
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (!showOtp || otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [showOtp, otpCountdown]);

  async function onSubmit(data: LoginFormData) {
    setError(null);
    try {
      const fullPhone = `+998${data.phone}`;
      await login(fullPhone);
      setOtpPhone(fullPhone);
      setOtpError(null);
      setOtpCountdown(RESEND_COOLDOWN);
      setShowOtp(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('otpInvalid'));
    }
  }

  const handleOtpSubmit = useCallback(
    async (code: string) => {
      setOtpSubmitting(true);
      setOtpError(null);
      try {
        const result = await verifyOtp(otpPhone, code);
        setShowOtp(false);
        if (result.is_new_user) {
          sessionStorage.setItem('verify_phone', otpPhone);
          router.push('/register');
        } else if (result.user?.is_admin) {
          router.push('/admin-verify');
        } else {
          router.push('/dashboard');
        }
      } catch (err) {
        setOtpError(err instanceof Error ? err.message : t('otpInvalid'));
      } finally {
        setOtpSubmitting(false);
      }
    },
    [otpPhone, verifyOtp, router, t],
  );

  const handleOtpResend = useCallback(async () => {
    if (otpCountdown > 0 || otpResending) return;
    setOtpResending(true);
    setOtpError(null);
    try {
      await login(otpPhone);
      setOtpCountdown(RESEND_COOLDOWN);
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setOtpResending(false);
    }
  }, [otpCountdown, otpResending, otpPhone, login]);

  /**
   * Telegram Login Widget callback. The widget is rendered as an iframe;
   * Telegram delivers the verified payload to the global callback, which
   * we forward to AuthContext.
   */
  const handleTelegramAuth = useCallback(
    async (payload: TelegramAuthPayload) => {
      setError(null);
      setTelegramSubmitting(true);
      try {
        const { user, is_new_user } = await telegramLogin(payload);
        if (is_new_user) {
          router.push('/register');
        } else if (user?.is_admin) {
          router.push('/admin-verify');
        } else {
          router.push('/dashboard');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('telegramLogin.linkFailed'));
      } finally {
        setTelegramSubmitting(false);
      }
    },
    [telegramLogin, router, t],
  );

  // Format phone for display: +998 XX XXX XX XX
  const displayPhone = otpPhone
    ? `${otpPhone.slice(0, 4)} ${otpPhone.slice(4, 6)} ${otpPhone.slice(6, 9)} ${otpPhone.slice(9, 11)} ${otpPhone.slice(11)}`
    : '';

  return (
    <>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Phone className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t('welcomeTitle')}</CardTitle>
          <CardDescription>{t('welcomeSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <OtpChannelToggle
            value={channel}
            onChange={setChannel}
            disabled={isSubmitting || telegramSubmitting}
          />

          {channel === 'sms' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t('phoneNumber')}</Label>
                <div className="flex gap-2">
                  <div className="flex h-8 items-center rounded-lg border border-input bg-muted px-3 text-sm font-medium text-muted-foreground">
                    {t('phonePrefix')}
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder={t('phonePlaceholder')}
                    autoComplete="tel-national"
                    autoFocus
                    maxLength={9}
                    {...register('phone')}
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-destructive">{t('phoneInvalid')}</p>
                )}
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {t('sendOtp')}
                    <ArrowRight className="ml-1 h-4 w-4" data-icon="inline-end" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                {t('newUserHint')}
              </p>
            </form>
          )}

          {channel === 'telegram' && (
            <div className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                {t('telegramLogin.subtitle')}
              </p>
              <div className="flex justify-center">
                {telegramSubmitting ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    {t('telegramLogin.linking')}
                  </div>
                ) : (
                  <TelegramLoginButton
                    botUsername={TELEGRAM_BOT_USERNAME}
                    onAuth={handleTelegramAuth}
                  />
                )}
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <p className="text-center text-xs text-muted-foreground">
                {t('telegramLogin.helperText')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <OtpDialog
        isOpen={showOtp}
        onClose={() => setShowOtp(false)}
        onSubmit={handleOtpSubmit}
        title={t('verifyTitle')}
        description={`${t('verifySubtitle')} ${displayPhone}`}
        error={otpError}
        isSubmitting={otpSubmitting}
        countdown={otpCountdown}
        onResend={handleOtpResend}
        isResending={otpResending}
      />
    </>
  );
}
