'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api';
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
import { ShieldCheck, ArrowRight, Loader2, LayoutDashboard } from 'lucide-react';

const passwordSchema = z.object({
  password: z.string().min(8, 'passwordMinLength'),
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function AdminVerifyPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Redirect to dashboard if not admin
  useEffect(() => {
    if (!isLoading && user && !user.is_admin) {
      router.replace('/dashboard');
    }
  }, [isLoading, user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '' },
  });

  async function onSubmit(data: PasswordFormData) {
    setError(null);
    try {
      const result = await authApi.verifyAdminPassword(data.password);
      if (!result.success) {
        setError(result.error || t('adminPasswordInvalid'));
        return;
      }
      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('adminPasswordInvalid'));
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user?.is_admin) return null;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">{t('adminVerifyTitle')}</CardTitle>
        <CardDescription>{t('adminVerifySubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t('adminPassword')}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t('adminPasswordPlaceholder')}
              autoFocus
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{t('adminPasswordMinLength')}</p>
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
                {t('adminVerifyButton')}
                <ArrowRight className="ml-1 h-4 w-4" data-icon="inline-end" />
              </>
            )}
          </Button>
        </form>

        {/* Option to continue as regular user */}
        <div className="mt-4 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LayoutDashboard className="h-3 w-3" />
            {t('adminSkipToDashboard')}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
