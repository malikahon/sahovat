'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Per-route error boundary. Wraps the children of a route segment and
 * catches client-side render errors.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errorPages');

  useEffect(() => {
    // Log to server-side observability later; for now stdout is fine.
    console.error('[Sahovat] route error boundary caught:', error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="size-16 text-destructive/60" />
      <h1 className="text-2xl font-bold text-foreground">{t('serverErrorTitle')}</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {t('serverErrorDescription')}
      </p>
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={() => reset()}>
          {t('tryAgain')}
        </Button>
        <Button render={<Link href="/" />}>{t('goHome')}</Button>
      </div>
    </div>
  );
}
