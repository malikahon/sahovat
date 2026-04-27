'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { donationsApi } from '@/lib/api';
import type { PaymentProvider } from '@/lib/types';

/**
 * Mock Click checkout page — visual fidelity to docs.click.uz.
 *
 * Click brand colors (per merchant.click.uz public assets):
 *   navy   #1B2A4E
 *   red    #EE2C40
 *   white  #FFFFFF
 *
 * The page is intentionally locale-fixed (English brand voice) because
 * a real third-party gateway page would also not be localized to the
 * platform i18n. This is a simulated external surface.
 */
export default function MockClickCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const donationId = params.donation_id as string;
  const amount = searchParams.get('amount') ?? '0';

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleApprove = async () => {
    setIsProcessing(true);
    setError('');
    try {
      const res = await donationsApi.simulatePayment(
        donationId,
        Number(amount),
        'click' as PaymentProvider,
      );
      if (res.success) {
        router.push(`/donation-return?merchant_trans_id=${donationId}&payment_status=1`);
      } else {
        setError(res.error || 'Payment failed');
      }
    } catch {
      setError('Payment simulation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = () => {
    router.push(`/donation-return?merchant_trans_id=${donationId}&payment_status=2`);
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: '#F5F6FA' }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Click brand header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ backgroundColor: '#1B2A4E' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md font-extrabold text-white"
              style={{ backgroundColor: '#EE2C40' }}
            >
              C
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Click
            </span>
          </div>
          <span className="text-xs font-medium uppercase tracking-widest text-white/60">
            Secure Payment
          </span>
        </div>

        {/* Body */}
        <div className="space-y-6 p-6">
          {/* Amount card */}
          <div
            className="rounded-lg border-l-4 px-4 py-3"
            style={{ borderColor: '#EE2C40', backgroundColor: '#FFF6F7' }}
          >
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Amount to pay
            </p>
            <p className="mt-1 text-3xl font-extrabold" style={{ color: '#1B2A4E' }}>
              {new Intl.NumberFormat('uz-UZ').format(Number(amount))}{' '}
              <span className="text-base font-semibold text-gray-500">UZS</span>
            </p>
          </div>

          {/* Card form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="card-number" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
                Card Number
              </Label>
              <Input
                id="card-number"
                type="text"
                defaultValue="8600 5555 5555 4444"
                readOnly
                className="border-gray-200 bg-white font-mono text-base text-gray-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="card-expiry" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Expiry
                </Label>
                <Input
                  id="card-expiry"
                  type="text"
                  defaultValue="12/28"
                  readOnly
                  className="border-gray-200 bg-white font-mono text-gray-900"
                />
              </div>
              <div>
                <Label htmlFor="card-cvv" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
                  CVV
                </Label>
                <Input
                  id="card-cvv"
                  type="text"
                  defaultValue="***"
                  readOnly
                  className="border-gray-200 bg-white font-mono text-gray-900"
                />
              </div>
            </div>
          </div>

          {error && (
            <div
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', color: '#B91C1C' }}
            >
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={handleApprove}
              disabled={isProcessing}
              className="w-full rounded-md px-4 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition-all hover:brightness-110 active:brightness-95 disabled:opacity-60"
              style={{ backgroundColor: '#EE2C40' }}
            >
              {isProcessing ? 'Processing...' : `Pay ${new Intl.NumberFormat('uz-UZ').format(Number(amount))} UZS`}
            </button>
            <button
              type="button"
              onClick={handleDecline}
              disabled={isProcessing}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>

          <p className="text-center text-[11px] text-gray-400">
            Simulated checkout · no real payment processed
          </p>
        </div>
      </div>
    </div>
  );
}
