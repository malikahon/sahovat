'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Download, Heart, TrendingUp, FileText } from 'lucide-react';
import { donationsApi } from '@/lib/api';
import { DonationStatus } from '@/lib/types';
import type { DonationWithCampaign } from '@/lib/types';
import { formatUZS, formatDate } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

// ============================================================
// Status badge
// ============================================================

function DonationStatusBadge({ status }: { status: DonationStatus }) {
  const t = useTranslations('donations');
  const variants: Record<DonationStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    [DonationStatus.COMPLETED]: 'default',
    [DonationStatus.PENDING]: 'secondary',
    [DonationStatus.FAILED]: 'destructive',
    [DonationStatus.REFUNDED]: 'outline',
  };
  return <Badge variant={variants[status]}>{t(`status.${status}`)}</Badge>;
}

// ============================================================
// Donation card
// ============================================================

function DonationCard({ donation }: { donation: DonationWithCampaign }) {
  const t = useTranslations('donations');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await donationsApi.downloadReceipt(donation.id);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${donation.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card>
      <CardContent className="flex items-start gap-4 py-4">
        {/* Campaign thumbnail */}
        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
          {donation.campaign_cover_image_url ? (
            <Image
              src={donation.campaign_cover_image_url}
              alt={donation.campaign_title}
              fill
              className="object-cover"
              sizes="56px"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <FileText className="size-6 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/campaigns/${donation.campaign_id}`}
              className="truncate text-sm font-medium text-foreground hover:underline"
            >
              {donation.campaign_title}
            </Link>
            <DonationStatusBadge status={donation.status} />
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{formatUZS(donation.amount)}</span>
            {donation.completed_at && (
              <span>{formatDate(donation.completed_at)}</span>
            )}
            {donation.is_anonymous && (
              <span className="italic">{t('anonymousDonor')}</span>
            )}
          </div>

          {donation.note && (
            <p className="mt-1 truncate text-xs italic text-muted-foreground">
              "{donation.note}"
            </p>
          )}
        </div>

        {/* Receipt download */}
        {donation.status === DonationStatus.COMPLETED && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={handleDownload}
            disabled={isDownloading}
            title={t('downloadReceipt')}
          >
            <Download className="size-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Loading skeleton
// ============================================================

function DonationListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-start gap-4 py-4">
            <Skeleton className="size-14 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================
// Main page
// ============================================================

export default function MyDonationsPage() {
  const t = useTranslations('donations');
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-donations', page],
    queryFn: () => donationsApi.listMy({ page, limit: LIMIT }),
  });

  const donations = data?.data ?? [];
  const pagination = data?.pagination;

  // Compute impact stats from all loaded donations
  const completedDonations = donations.filter(
    (d: DonationWithCampaign) => d.status === DonationStatus.COMPLETED,
  );
  const totalDonated = completedDonations.reduce(
    (sum: number, d: DonationWithCampaign) => sum + d.amount, 0,
  );
  const uniqueCampaigns = new Set(completedDonations.map((d: DonationWithCampaign) => d.campaign_id)).size;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Impact summary (only show once data loaded and there are donations) */}
      {!isLoading && completedDonations.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <TrendingUp className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('totalDonated')}</p>
                <p className="text-base font-bold text-foreground">{formatUZS(totalDonated)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <Heart className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('campaignsSupported')}</p>
                <p className="text-base font-bold text-foreground">{uniqueCampaigns}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Separator />

      {/* Donation list */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t('history')}
        </h2>

        {isLoading && <DonationListSkeleton />}

        {isError && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {t('errors.initiateFailed')}
          </div>
        )}

        {!isLoading && !isError && donations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Heart className="mb-4 size-14 text-muted-foreground/30" />
            <h3 className="text-base font-medium text-foreground">{t('empty')}</h3>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">{t('emptyDescription')}</p>
            <Button className="mt-5" render={<Link href="/campaigns" />}>
              {t('browseCampaigns')}
            </Button>
          </div>
        )}

        {!isLoading && donations.length > 0 && (
          <div className="space-y-3">
            {donations.map((donation: DonationWithCampaign) => (
              <DonationCard key={donation.id} donation={donation} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {pagination.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.total_pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
