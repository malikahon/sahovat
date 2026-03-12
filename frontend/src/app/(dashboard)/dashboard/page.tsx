'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { TrendingUp, Wallet, Clock, ArrowUpRight, Plus, Sparkles } from 'lucide-react';
import { withdrawalsApi, feedApi } from '@/lib/api';
import { formatUZS } from '@/lib/formatters';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import CampaignCard from '@/components/campaign/CampaignCard';
import type { CampaignWithBalance, CampaignWithStats } from '@/lib/types';

// ============================================================
// STATUS BADGE
// ============================================================

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending_review: 'bg-yellow-100 text-yellow-700',
    active: 'bg-green-100 text-green-700',
    paused: 'bg-blue-100 text-blue-700',
    completed: 'bg-purple-100 text-purple-700',
    cancelled: 'bg-red-100 text-red-700',
    frozen: 'bg-slate-100 text-slate-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

// ============================================================
// CAMPAIGN CARD
// ============================================================

function OrganizerCampaignCard({ campaign }: { campaign: CampaignWithBalance }) {
  const t = useTranslations('dashboard');
  const { balance } = campaign;
  const progress = campaign.goal_amount > 0
    ? Math.min(100, Math.round((campaign.current_amount / campaign.goal_amount) * 100))
    : 0;

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h3 className="font-medium text-foreground truncate text-sm">{campaign.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={campaign.status} />
              <span className="text-xs text-muted-foreground capitalize">{campaign.category}</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">
            {campaign.donor_count} donors
          </Badge>
        </div>

        {/* Goal progress */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{formatUZS(campaign.current_amount)}</span>
            <span>{progress}% of {formatUZS(campaign.goal_amount)}</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Balance breakdown */}
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground">{t('available')}</p>
            <p className="text-xs font-semibold text-green-600 truncate">
              {formatUZS(balance.available_balance)}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground">{t('withdrawn')}</p>
            <p className="text-xs font-semibold truncate">
              {formatUZS(balance.total_withdrawn)}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground">{t('pending')}</p>
            <p className="text-xs font-semibold text-yellow-600 truncate">
              {formatUZS(balance.pending_withdrawals)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {balance.available_balance > 0 && (
            <Link href={`/campaigns/${campaign.id}/withdraw`} className="flex-1">
              <Button size="sm" className="w-full text-xs h-7">
                <ArrowUpRight className="size-3 mr-1" />
                {t('requestWithdrawal')}
              </Button>
            </Link>
          )}
          <Link href="/my-campaigns" className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-xs h-7">
              {t('viewHistory')}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  title,
  value,
  icon: Icon,
  colorClass,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-lg font-bold text-foreground mt-1">{value}</p>
          </div>
          <div className={`rounded-full p-2 ${colorClass}`}>
            <Icon className="size-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function DashboardPage() {
  const t = useTranslations('dashboard');

  const { data, isLoading } = useQuery({
    queryKey: ['organizer-dashboard'],
    queryFn: async () => {
      const res = await withdrawalsApi.getDashboard();
      if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to load');
      return res.data;
    },
  });

  // Personalized feed (Week 11)
  const { data: feedData, isLoading: feedLoading } = useQuery({
    queryKey: ['personalized-feed'],
    queryFn: async () => {
      const res = await feedApi.getPersonalized({ limit: 6 });
      if (!res.success) return [];
      return res.data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      </div>
    );
  }

  const totals = data?.totals ?? {
    total_raised: 0,
    total_withdrawn: 0,
    total_available: 0,
    total_pending_withdrawals: 0,
  };
  const campaigns = data?.campaigns ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <Link href="/create-campaign">
          <Button size="sm">
            <Plus className="size-4 mr-1.5" />
            {t('createCampaign')}
          </Button>
        </Link>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          title={t('totalRaised')}
          value={formatUZS(totals.total_raised)}
          icon={TrendingUp}
          colorClass="bg-blue-50 text-blue-600"
        />
        <StatCard
          title={t('availableBalance')}
          value={formatUZS(totals.total_available)}
          icon={Wallet}
          colorClass="bg-green-50 text-green-600"
        />
        <StatCard
          title={t('totalWithdrawn')}
          value={formatUZS(totals.total_withdrawn)}
          icon={ArrowUpRight}
          colorClass="bg-purple-50 text-purple-600"
        />
        <StatCard
          title={t('pendingWithdrawals')}
          value={formatUZS(totals.total_pending_withdrawals)}
          icon={Clock}
          colorClass="bg-yellow-50 text-yellow-600"
        />
      </div>

      {/* Campaign cards */}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">{t('noCampaigns')}</p>
            <p className="text-sm text-muted-foreground mb-6">{t('noCampaignsDesc')}</p>
            <Link href="/create-campaign">
              <Button>
                <Plus className="size-4 mr-1.5" />
                {t('createCampaign')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">{t('campaignStats')}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <OrganizerCampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        </div>
      )}

      {/* Personalized Feed — "For You" section (Week 11) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{t('forYou')}</h2>
        </div>
        {feedLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : (feedData as CampaignWithStats[] | undefined)?.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(feedData as CampaignWithStats[]).map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">{t('forYouEmpty')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
