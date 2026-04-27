'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ShieldCheck } from 'lucide-react';

const OTP_LENGTH = 6;

interface OtpDialogProps {
  /** Controls dialog open state */
  isOpen: boolean;
  /** Called when the dialog is dismissed (close button, backdrop click, escape) */
  onClose: () => void;
  /**
   * Called when the user finishes entering all 6 digits.
   * The parent should verify the code and call `setError` if it fails.
   */
  onSubmit: (code: string) => void | Promise<void>;
  /** Dialog title override */
  title?: string;
  /** Dialog description override (e.g. "Code sent to +998 XX XXX XX XX") */
  description?: string;
  /** Error message to display (controlled by parent) */
  error?: string | null;
  /** Whether an async submit is in progress (disables inputs) */
  isSubmitting?: boolean;
  /** Resend countdown in seconds. 0 means resend is available. */
  countdown: number;
  /** Called when the user clicks "Resend Code" */
  onResend: () => void;
  /** Whether the resend request is in flight */
  isResending?: boolean;
}

export function OtpDialog({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  error,
  isSubmitting = false,
  countdown,
  onResend,
  isResending = false,
}: OtpDialogProps) {
  const t = useTranslations('auth');

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isSubmittingRef = useRef(false);

  // Sync the ref with prop so auto-submit guard works
  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  // Reset OTP when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setOtp(Array(OTP_LENGTH).fill(''));
      // Focus first input after dialog animation
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  // Reset OTP on error so user can re-type
  useEffect(() => {
    if (error) {
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }
  }, [error]);

  const handleSubmit = useCallback(
    (code: string) => {
      if (code.length !== OTP_LENGTH || isSubmittingRef.current) return;
      onSubmit(code);
    },
    [onSubmit],
  );

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = newOtp.join('');
    if (fullCode.length === OTP_LENGTH) {
      handleSubmit(fullCode);
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
      handleSubmit(pasted);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="text-center items-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>{title || t('verifyTitle')}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* 6-digit OTP inputs */}
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
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
                disabled={isSubmitting}
                className="h-12 w-12 text-center text-lg font-semibold"
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>

          {/* Loading indicator */}
          {isSubmitting && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('verifyOtp')}...
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-center text-sm text-destructive">
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
                onClick={onResend}
                disabled={isResending}
              >
                {isResending ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : null}
                {t('otpResend')}
              </Button>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
