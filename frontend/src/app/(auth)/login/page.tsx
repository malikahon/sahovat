'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { OtpDialog } from '@/components/shared/OtpDialog';

const RESEND_COOLDOWN = 60;

type AuthChannel = 'phone' | 'email';

const phoneSchema = z.object({
  phone: z
    .string()
    .regex(/^\d{9}$/, 'phoneInvalid'),
});

const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('emailInvalid')
    .max(255, 'emailInvalid'),
});

type PhoneFormData = z.infer<typeof phoneSchema>;
type EmailFormData = z.infer<typeof emailSchema>;

export default function LoginPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const { login, verifyOtp, loginWithEmail, verifyEmailOtp } = useAuth();

  const [activeTab, setActiveTab] = useState<AuthChannel>('phone');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // OTP dialog state (shared by both channels)
  const [showOtp, setShowOtp] = useState(false);
  const [otpChannel, setOtpChannel] = useState<AuthChannel>('phone');
  const [otpPhone, setOtpPhone] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(RESEND_COOLDOWN);
  const [otpResending, setOtpResending] = useState(false);

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  });

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  // Countdown timer
  useEffect(() => {
    if (!showOtp || otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [showOtp, otpCountdown]);

  async function onSubmitPhone(data: PhoneFormData) {
    setPhoneError(null);
    try {
      const fullPhone = `+998${data.phone}`;
      await login(fullPhone);
      setOtpChannel('phone');
      setOtpPhone(fullPhone);
      setOtpEmail('');
      setOtpError(null);
      setOtpCountdown(RESEND_COOLDOWN);
      setShowOtp(true);
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : t('otpInvalid'));
    }
  }

  async function onSubmitEmail(data: EmailFormData) {
    setEmailError(null);
    try {
      await loginWithEmail(data.email, locale);
      setOtpChannel('email');
      setOtpEmail(data.email);
      setOtpPhone('');
      setOtpError(null);
      setOtpCountdown(RESEND_COOLDOWN);
      setShowOtp(true);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : t('otpInvalid'));
    }
  }

  const handleOtpSubmit = useCallback(
    async (code: string) => {
      setOtpSubmitting(true);
      setOtpError(null);
      try {
        const result =
          otpChannel === 'phone'
            ? await verifyOtp(otpPhone, code)
            : await verifyEmailOtp(otpEmail, code);
        setShowOtp(false);
        if (result.is_new_user) {
          if (otpChannel === 'phone') {
            sessionStorage.setItem('verify_phone', otpPhone);
          } else {
            sessionStorage.setItem('verify_email', otpEmail);
          }
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
    [otpChannel, otpPhone, otpEmail, verifyOtp, verifyEmailOtp, router, t],
  );

  const handleOtpResend = useCallback(async () => {
    if (otpCountdown > 0 || otpResending) return;
    setOtpResending(true);
    setOtpError(null);
    try {
      if (otpChannel === 'phone') {
        await login(otpPhone);
      } else {
        await loginWithEmail(otpEmail, locale);
      }
      setOtpCountdown(RESEND_COOLDOWN);
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setOtpResending(false);
    }
  }, [otpCountdown, otpResending, otpChannel, otpPhone, otpEmail, login, loginWithEmail, locale]);

  // Format phone for display: +998 XX XXX XX XX
  const displayPhone = otpPhone
    ? `${otpPhone.slice(0, 4)} ${otpPhone.slice(4, 6)} ${otpPhone.slice(6, 9)} ${otpPhone.slice(9, 11)} ${otpPhone.slice(11)}`
    : '';

  const otpTitle = otpChannel === 'email' ? t('verifyEmailTitle') : t('verifyTitle');
  const otpDescription =
    otpChannel === 'email'
      ? `${t('verifyEmailSubtitle')} ${otpEmail}`
      : `${t('verifySubtitle')} ${displayPhone}`;

  return (
    <>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {activeTab === 'phone' ? (
              <Phone className="h-6 w-6 text-primary" />
            ) : (
              <Mail className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">{t('welcomeTitle')}</CardTitle>
          <CardDescription>{t('welcomeSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab((v as AuthChannel) ?? 'phone')}
            className="w-full"
          >
            <TabsList className="mb-6 w-full">
              <TabsTrigger value="phone">{t('tabPhone')}</TabsTrigger>
              <TabsTrigger value="email">{t('tabEmail')}</TabsTrigger>
            </TabsList>

            {/* PHONE TAB */}
            <TabsContent value="phone">
              <form onSubmit={phoneForm.handleSubmit(onSubmitPhone)} className="space-y-4">
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
                      {...phoneForm.register('phone')}
                    />
                  </div>
                  {phoneForm.formState.errors.phone && (
                    <p className="text-sm text-destructive">{t('phoneInvalid')}</p>
                  )}
                </div>

                {phoneError && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    {phoneError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={phoneForm.formState.isSubmitting}
                >
                  {phoneForm.formState.isSubmitting ? (
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
            </TabsContent>

            {/* EMAIL TAB */}
            <TabsContent value="email">
              <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    placeholder={t('emailPlaceholder')}
                    autoComplete="email"
                    autoFocus
                    {...emailForm.register('email')}
                  />
                  {emailForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{t('emailInvalid')}</p>
                  )}
                </div>

                {emailError && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    {emailError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={emailForm.formState.isSubmitting}
                >
                  {emailForm.formState.isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {t('sendOtp')}
                      <ArrowRight className="ml-1 h-4 w-4" data-icon="inline-end" />
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  {t('emailNewUserHint')}
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <OtpDialog
        isOpen={showOtp}
        onClose={() => setShowOtp(false)}
        onSubmit={handleOtpSubmit}
        title={otpTitle}
        description={otpDescription}
        error={otpError}
        isSubmitting={otpSubmitting}
        countdown={otpCountdown}
        onResend={handleOtpResend}
        isResending={otpResending}
      />
    </>
  );
}
