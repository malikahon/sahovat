'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export function VerifyForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';

  const { verifyOtp, login } = useAuth();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [isResending, setIsResending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!phone) {
      router.replace('/login');
    }
  }, [phone, router]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const submitOtp = useCallback(
    async (code: string) => {
      if (code.length !== OTP_LENGTH || isSubmitting) return;
      setIsSubmitting(true);
      setError(null);

      try {
        const result = await verifyOtp(phone, code);
        if (result.is_new_user) {
          router.push('/register');
        } else {
          router.push('/dashboard');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('otpInvalid'));
        setOtp(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      } finally {
        setIsSubmitting(false);
      }
    },
    [phone, verifyOtp, router, isSubmitting, t],
  );

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError(null);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = newOtp.join('');
    if (fullCode.length === OTP_LENGTH) {
      submitOtp(fullCode);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);

    const nextEmpty = newOtp.findIndex((d) => !d);
    const focusIndex = nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty;
    inputRefs.current[focusIndex]?.focus();

    if (pasted.length === OTP_LENGTH) {
      submitOtp(pasted);
    }
  }

  async function handleResend() {
    if (countdown > 0 || isResending) return;
    setIsResending(true);
    setError(null);

    try {
      await login(phone);
      setCountdown(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  }

  const displayPhone = phone
    ? `${phone.slice(0, 4)} ${phone.slice(4, 6)} ${phone.slice(6, 9)} ${phone.slice(9, 11)} ${phone.slice(11)}`
    : '';

  if (!phone) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-sage-100 shadow-warm-xs">
          <ShieldCheck className="h-5 w-5 text-sage-600" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t('verifyTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('verifySubtitle')}{' '}
          <span className="font-semibold text-foreground">{displayPhone}</span>
        </p>
      </div>

      {/* OTP Input Fields */}
      <div className="space-y-6">
        <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              autoFocus={index === 0}
              disabled={isSubmitting}
              className="h-13 w-12 rounded-xl text-center text-xl font-bold shadow-warm-xs transition-all focus:shadow-warm-sm focus:ring-2 focus:ring-sage-500/30"
              aria-label={`Digit ${index + 1}`}
            />
          ))}
        </div>

        {/* Loading indicator */}
        {isSubmitting && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-sage-500" />
            {t('verifyOtp')}...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Resend */}
        <div className="text-center">
          {countdown > 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('otpResendIn', { seconds: countdown })}
            </p>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={isResending}
              className="text-sage-600 hover:text-sage-700"
            >
              {isResending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : null}
              {t('otpResend')}
            </Button>
          )}
        </div>

        {/* Back to login */}
        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}
