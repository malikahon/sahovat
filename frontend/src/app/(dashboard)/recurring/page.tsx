'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Repeat, Heart } from 'lucide-react';
import { recurringApi } from '@/lib/api';
import { RecurringStatus } from '@/lib/types';
import type { RecurringDonation } from '@/lib/types';
import { formatUZS } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { RecurringCard } from '@/components/recurring/RecurringCard';

// ============================================================
// Main page
// ============================================================

export default function RecurringDonationsPage() {
  const t = useTranslations('recurring');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-recurring', page],
    queryFn: () => recurringApi.listMy({ page, limit: LIMIT }),
  });

  const recurring = (data?.data ?? []) as (RecurringDonation & {
    campaign_title?: string | null;
    campaign_cover_image_url?: string | null;
  })[];
  const pagination = data?.pagination;

  // Compute summary stats
  const activeItems = recurring.filter(
    (r) => r.status === RecurringStatus.ACTIVE,
  );
  const activeCount = activeItems.length;

  // Monthly equivalent: monthly amount + weekly * ~4.3
  const monthlyTotal = activeItems.reduce((sum, r) => {
    const amount = Number(r.amount);
    return sum + (r.frequency === 'weekly' ? amount * 4 : amount);
  }, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Summary stats */}
      {!isLoading && recurring.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <Repeat className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('activeSubscriptions')}</p>
                <p className="text-base font-bold text-foreground">{activeCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <Heart className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('monthlyTotal')}</p>
                <p className="text-base font-bold text-foreground">{formatUZS(monthlyTotal)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Separator />

      {/* List */}
      <div>
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="flex items-start gap-4 py-4">
                  <Skeleton className="size-14 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-6 w-1/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {isError && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            An error occurred while loading recurring donations.
          </div>
        )}

        {!isLoading && !isError && recurring.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Repeat className="mb-4 size-14 text-muted-foreground/30" />
            <h3 className="text-base font-medium text-foreground">{t('empty')}</h3>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              {t('emptyDescription')}
            </p>
            <Button className="mt-5" render={<Link href="/campaigns" />}>
              {t('browseCampaigns')}
            </Button>
          </div>
        )}

        {!isLoading && recurring.length > 0 && (
          <div className="space-y-3">
            {recurring.map((item) => (
              <RecurringCard key={item.id} recurring={item} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
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
              {page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
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
