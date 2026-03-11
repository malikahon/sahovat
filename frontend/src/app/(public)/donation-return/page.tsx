'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { donationsApi } from '@/lib/api';

/**
 * PayMe return URL handler.
 * PayMe redirects here after payment with query params:
 *   ?donation_id=xxx&status=success|cancel
 *
 * In dev mode this page won't be reached (simulate button is used instead).
 * In production this is the actual return URL registered with PayMe.
 */
function DonationReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const donationId = searchParams.get('donation_id');
  const status = searchParams.get('status');

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
        <p className="text-muted-foreground">Verifying payment...</p>
      </div>
    );
  }

  if (status === 'cancel') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <XCircle className="size-16 text-destructive" />
        <h2 className="text-xl font-bold text-foreground">Payment Cancelled</h2>
        <p className="text-sm text-muted-foreground">Your donation was not processed. You can try again.</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
          <Button render={<Link href="/campaigns" />}>Browse Campaigns</Button>
        </div>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <CheckCircle className="size-16 text-green-600" />
        <h2 className="text-xl font-bold text-foreground">Donation Successful!</h2>
        <p className="text-sm text-muted-foreground">
          Thank you for your generosity. Your donation has been received.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" render={<Link href="/my-donations" />}>My Donations</Button>
          <Button render={<Link href="/campaigns" />}>Browse More</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <XCircle className="size-16 text-muted-foreground/40" />
      <h2 className="text-xl font-bold text-foreground">Something Went Wrong</h2>
      <p className="text-sm text-muted-foreground">
        We could not verify your payment. Please check your donation history.
      </p>
      <Button render={<Link href="/my-donations" />}>My Donations</Button>
    </div>
  );
}

export default function DonationReturnPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <DonationReturnContent />
    </Suspense>
  );
}
