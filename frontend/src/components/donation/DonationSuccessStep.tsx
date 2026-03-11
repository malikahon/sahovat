'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CheckCircle, Download, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { donationsApi } from '@/lib/api';
import { formatUZS } from '@/lib/formatters';

interface Props {
  donationId: string;
  campaignTitle: string;
  amount: number;
  onDonateAgain: () => void;
  onClose: () => void;
}

export function DonationSuccessStep({
  donationId,
  campaignTitle,
  amount,
  onDonateAgain,
  onClose,
}: Props) {
  const t = useTranslations('donations');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const handleDownloadReceipt = async () => {
    setIsDownloading(true);
    setDownloadError('');
    try {
      const blob = await donationsApi.downloadReceipt(donationId);
      if (!blob) {
        setDownloadError(t('errors.receiptFailed'));
        return;
      }
      // Trigger browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `donation-receipt-${donationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError(t('errors.receiptFailed'));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-5 py-2 text-center">
      {/* Success icon */}
      <div className="flex size-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
        <CheckCircle className="size-10 text-green-600 dark:text-green-400" />
      </div>

      {/* Title */}
      <div>
        <h3 className="text-xl font-bold text-foreground">{t('successTitle')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('successDescription')}</p>
      </div>

      {/* Summary */}
      <div className="w-full rounded-xl border border-border bg-muted/30 p-4 text-sm">
        <div className="flex items-center justify-center gap-2 text-foreground">
          <Heart className="size-4 text-red-500 fill-red-500" />
          <span>
            {t('youDonated', { amount: formatUZS(amount), campaign: campaignTitle })}
          </span>
        </div>
      </div>

      {downloadError && (
        <p className="text-xs text-destructive">{downloadError}</p>
      )}

      {/* Actions */}
      <div className="w-full space-y-2">
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleDownloadReceipt}
          disabled={isDownloading}
        >
          <Download className="size-4" />
          {isDownloading ? t('downloadingReceipt') : t('downloadReceipt')}
        </Button>

        <Button
          variant="ghost"
          className="w-full"
          render={<Link href="/my-donations" onClick={onClose} />}
        >
          {t('viewMyDonations')}
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onDonateAgain}>
            {t('donateAgain')}
          </Button>
          <Button className="flex-1" onClick={onClose}>
            {t('close')}
          </Button>
        </div>
      </div>
    </div>
  );
}
