'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { donationsApi } from '@/lib/api';

/**
 * Payment return URL handler.
 *
 * PayMe redirects here after payment with:
 *   ?donation_id=xxx&status=success|cancel
 *
 * Click redirects here after payment with:
 *   ?merchant_trans_id=xxx&payment_status=1 (success) | 2 (cancel/failure)
 *
 * In dev mode this page won't be reached (simulate button is used instead).
 */
function DonationReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('donationReturn');

  // Unified: accept both PayMe and Click query param formats
  const donationId = searchParams.get('donation_id') ?? searchParams.get('merchant_trans_id');
  const rawStatus = searchParams.get('status') ?? (
    searchParams.get('payment_status') === '1' ? 'success'
    : searchParams.get('payment_status') === '2' ? 'cancel'
    : null
  );
  const status = rawStatus === 'success' ? 'success' : rawStatus === 'cancel' ? 'cancel' : null;

  const [isChecking, setIsChecking] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!donationId || status !== 'success') {
      setIsChecking(false);
      return;
    }

    // Poll the donation status to confirm it completed
    const check = async () => {
      try {
        const res = await donationsApi.getById(donationId);
        if (res.success && res.data && (res.data as { status?: string }).status === 'completed') {
          setVerified(true);
        }
      } finally {
        setIsChecking(false);
      }
    };

    check();
  }, [donationId, status]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{t('verifying')}</p>
      </div>
    );
  }

  if (status === 'cancel') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <XCircle className="size-16 text-destructive" />
        <h2 className="text-xl font-bold text-foreground">{t('cancelTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('cancelMessage')}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>{t('goBack')}</Button>
          <Button render={<Link href="/campaigns" />}>{t('browseCampaigns')}</Button>
        </div>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <CheckCircle className="size-16 text-green-600" />
        <h2 className="text-xl font-bold text-foreground">{t('successTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('successMessage')}</p>
        <div className="flex gap-3">
          <Button variant="outline" render={<Link href="/my-donations" />}>{t('myDonations')}</Button>
          <Button render={<Link href="/campaigns" />}>{t('browseMore')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <XCircle className="size-16 text-muted-foreground/40" />
      <h2 className="text-xl font-bold text-foreground">{t('errorTitle')}</h2>
      <p className="text-sm text-muted-foreground">{t('errorMessage')}</p>
      <Button render={<Link href="/my-donations" />}>{t('myDonations')}</Button>
    </div>
  );
}

function DonationReturnFallback() {
  const t = useTranslations('donationReturn');
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">{t('loading')}</p>
    </div>
  );
}

export default function DonationReturnPage() {
  return (
    <Suspense fallback={<DonationReturnFallback />}>
      <DonationReturnContent />
    </Suspense>
  );
}