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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
      sessionStorage.setItem('verify_phone', fullPhone);
      router.push('/verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('otpInvalid'));
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Phone className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">{t('welcomeTitle')}</CardTitle>
        <CardDescription>{t('welcomeSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
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
        </form>
      </CardContent>
    </Card>
  );
}
