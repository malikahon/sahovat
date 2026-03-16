'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, ArrowRight, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  phone: z
    .string()
    .regex(/^\d{9}$/, 'phoneInvalid'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '' },
  });

  async function onSubmit(data: LoginFormData) {
    setError(null);
    try {
      const fullPhone = `+998${data.phone}`;
      await login(fullPhone);
      router.push(`/verify?phone=${encodeURIComponent(fullPhone)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('otpInvalid'));
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-sage-100 shadow-warm-xs">
          <Phone className="h-5 w-5 text-sage-600" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t('welcomeTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('welcomeSubtitle')}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium">
            {t('phoneNumber')}
          </Label>
          <div className="flex gap-2">
            <div className="flex h-10 items-center rounded-lg border border-border bg-sage-50 px-3.5 text-sm font-semibold text-sage-700">
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
              className="h-10"
              {...register('phone')}
            />
          </div>
          {errors.phone && (
            <p className="text-sm text-destructive">{t('phoneInvalid')}</p>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full shadow-warm-sm"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {t('sendOtp')}
              <ArrowRight className="ml-1.5 h-4 w-4" data-icon="inline-end" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
