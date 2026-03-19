'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  onPasswordSet: () => void;
}

export function SetPasswordForm({ onPasswordSet }: Props) {
  const t = useTranslations('auth');
  const { refreshUser } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(t('setPassword.minLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('setPassword.mismatch'));
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.setPassword(password);
      if (res.success) {
        await refreshUser();
        onPasswordSet();
      } else {
        setError(res.error || t('setPassword.failed'));
      }
    } catch {
      setError(t('setPassword.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="pt-6 space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
            <Lock className="size-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {t('setPassword.title')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('setPassword.description')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t('setPassword.password')}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('setPassword.passwordPlaceholder')}
              minLength={8}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t('setPassword.confirmPassword')}</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('setPassword.confirmPasswordPlaceholder')}
              minLength={8}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t('setPassword.setting') : t('setPassword.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
