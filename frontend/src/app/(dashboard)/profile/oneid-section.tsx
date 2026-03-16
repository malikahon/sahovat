'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle, ShieldAlert, Clock, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usersApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/formatters';
import type { VerificationStatus } from '@/lib/types';

export function OneIdSection() {
  const { user, refreshUser } = useAuth();
  const t = useTranslations('verification');
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Check if we just returned from OneID verification
  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setShowSuccess(true);
      refreshUser();
      // Clear the success message after 5 seconds
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, refreshUser]);

  const handleVerify = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await usersApi.initiateOneId();
      if (result.success && result.data?.redirect_url) {
        window.location.href = result.data.redirect_url;
      } else {
        setError(result.error || 'Failed to initiate verification');
      }
    } catch {
      setError('Failed to initiate verification');
    } finally {
      setIsLoading(false);
    }
  };

  const status = user?.verification_status as VerificationStatus;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="size-5" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showSuccess && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4" />
              {t('success')}
            </div>
          </div>
        )}

        {status === 'approved' && (
          <div className="flex items-center gap-3">
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="size-3" />
              {t('approved')}
            </Badge>
            {user?.oneid_verified_at && (
              <span className="text-sm text-muted-foreground">
                {t('verifiedAt', { date: formatDate(user.oneid_verified_at) })}
              </span>
            )}
          </div>
        )}

        {status === 'pending' && (
          <div className="space-y-2">
            <Badge className="bg-yellow-100 text-yellow-800">
              <Clock className="size-3" />
              {t('pending')}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {t('pendingDescription')}
            </p>
          </div>
        )}

        {(status === 'none' || status === 'rejected') && (
          <div className="space-y-3">
            {status === 'rejected' && (
              <div className="flex items-start gap-2">
                <Badge variant="destructive">
                  <ShieldAlert className="size-3" />
                  {t('rejected')}
                </Badge>
              </div>
            )}
            {status === 'none' && (
              <Badge variant="outline">
                {t('notVerified')}
              </Badge>
            )}
            <p className="text-sm text-muted-foreground">
              {status === 'rejected'
                ? t('rejectedDescription')
                : t('description')}
            </p>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              onClick={handleVerify}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t('verifyWithOneId')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Shield className="size-4" />
                  {t('verifyWithOneId')}
                </span>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
