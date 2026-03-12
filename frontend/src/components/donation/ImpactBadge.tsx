'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Heart, Flame, Repeat } from 'lucide-react';
import { recurringApi } from '@/lib/api';
import { formatUZS } from '@/lib/formatters';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================
// ImpactBadge
// ============================================================

interface Props {
  className?: string;
}

export function ImpactBadge({ className }: Props) {
  const t = useTranslations('impact');

  const { data, isLoading } = useQuery({
    queryKey: ['impact-stats'],
    queryFn: async () => {
      const res = await recurringApi.getImpact();
      if (!res.success || !res.data) return null;
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });

  if (isLoading) {
    return (
      <div className={`grid grid-cols-3 gap-3 ${className ?? ''}`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data || data.total_donations_count === 0) {
    return null; // Don't show badge if user has no donations
  }

  return (
    <div className={className}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{t('title')}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Donated */}
        <Card>
          <CardContent className="flex items-center gap-3 py-3 px-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <TrendingUp className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] text-muted-foreground">{t('totalDonated')}</p>
              <p className="truncate text-sm font-bold text-foreground">{formatUZS(data.total_donated)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Campaigns Supported */}
        <Card>
          <CardContent className="flex items-center gap-3 py-3 px-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-500/10">
              <Heart className="size-4 text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] text-muted-foreground">{t('campaignsSupported')}</p>
              <p className="truncate text-sm font-bold text-foreground">{data.campaigns_supported}</p>
            </div>
          </CardContent>
        </Card>

        {/* Streak */}
        <Card>
          <CardContent className="flex items-center gap-3 py-3 px-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
              <Flame className="size-4 text-orange-500" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] text-muted-foreground">{t('streak')}</p>
              <p className="truncate text-sm font-bold text-foreground">
                {data.streak_weeks > 0
                  ? t('streakWeeks', { count: data.streak_weeks })
                  : t('noStreak')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Active Recurring */}
        <Card>
          <CardContent className="flex items-center gap-3 py-3 px-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
              <Repeat className="size-4 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] text-muted-foreground">{t('activeRecurring')}</p>
              <p className="truncate text-sm font-bold text-foreground">{data.recurring_active_count}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
