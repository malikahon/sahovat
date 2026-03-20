'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  TrendingUp,
  Wallet,
  Clock,
  ArrowUpRight,
  Plus,
  Sparkles,
  Heart,
  HandCoins,
  Flame,
} from 'lucide-react';
import { withdrawalsApi, feedApi, donationsApi, recurringApi } from '@/lib/api';
import { formatUZS } from '@/lib/formatters';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import CampaignCard from '@/components/campaign/CampaignCard';
import type { CampaignWithBalance, CampaignWithStats, DonationWithCampaign } from '@/lib/types';

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
      {status.replaceAll('_', ' ')}
    </span>
  );
}

// ============================================================
// ORGANIZER CAMPAIGN CARD
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
// RECENT DONATION ROW
// ============================================================

function RecentDonationRow({ donation }: { donation: DonationWithCampaign }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {donation.campaign_title}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(donation.created_at).toLocaleDateString()}
        </p>
      </div>
      <span className="text-sm font-semibold text-foreground shrink-0 ml-4">
        {formatUZS(donation.amount)}
      </span>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function DashboardPage() {
  const t = useTranslations('dashboard');

  // Donor data: recent donations
  const { data: donorData, isLoading: donorLoading } = useQuery({
    queryKey: ['my-donations-dashboard'],
    queryFn: async () => {
      const res = await donationsApi.listMy({ page: 1, limit: 5 });
      if (!res.success) return { donations: [], total: 0 };
      const donations = res.data ?? [];
      const total = res.pagination?.total ?? 0;
      return { donations, total };
    },
  });

  // Impact stats: accurate total donated, campaigns supported, streak, recurring
  const { data: impactData, isLoading: impactLoading } = useQuery({
    queryKey: ['impact-stats'],
    queryFn: async () => {
      const res = await recurringApi.getImpact();
      if (!res.success || !res.data) return null;
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Organizer data: campaigns + balances
  const { data: organizerData, isLoading: organizerLoading } = useQuery({
    queryKey: ['organizer-dashboard'],
    queryFn: async () => {
      const res = await withdrawalsApi.getDashboard();
      if (!res.success || !res.data) return null;
      return res.data;
    },
  });

  // Personalized feed
  const { data: feedData, isLoading: feedLoading } = useQuery({
    queryKey: ['personalized-feed'],
    queryFn: async () => {
      const res = await feedApi.getPersonalized({ limit: 6 });
      if (!res.success) return [];
      return res.data ?? [];
    },
  });

  const isLoading = donorLoading && organizerLoading && impactLoading;
  const hasCampaigns = (organizerData?.campaigns?.length ?? 0) > 0;
  const donations = donorData?.donations ?? [];
  const totalDonations = donorData?.total ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {/* === DONOR SECTION (always shown) === */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          title={t('donorTotalDonated')}
          value={impactData ? formatUZS(impactData.total_donated) : '—'}
          icon={Heart}
          colorClass="bg-rose-50 text-rose-600"
        />
        <StatCard
          title={t('donorCampaignsSupported')}
          value={impactData ? String(impactData.campaigns_supported) : String(totalDonations)}
          icon={HandCoins}
          colorClass="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title={t('donorStreak')}
          value={impactData && impactData.streak_weeks > 0 ? `${impactData.streak_weeks}w` : '—'}
          icon={Flame}
          colorClass="bg-orange-50 text-orange-600"
        />
        <StatCard
          title={t('donorLatestDonation')}
          value={donations.length > 0 ? formatUZS(donations[0].amount) : '—'}
          icon={TrendingUp}
          colorClass="bg-blue-50 text-blue-600"
        />
      </div>

      {/* Recent donations */}
      {donations.length > 0 ? (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">{t('donorRecentDonations')}</h2>
              <Link href="/my-donations">
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  {t('donorViewAll')}
                </Button>
              </Link>
            </div>
            <div className="divide-y divide-border">
              {donations.map((d) => (
                <RecentDonationRow key={d.id} donation={d} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Heart className="size-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">{t('donorEmpty')}</p>
            <Link href="/campaigns">
              <Button variant="outline" size="sm">{t('donorBrowse')}</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* === ORGANIZER SECTION (shown only if user has campaigns) === */}
      {hasCampaigns && organizerData && (
        <>
          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{t('organizerSection')}</h2>
              <Link href="/create-campaign">
                <Button size="sm" variant="outline">
                  <Plus className="size-4 mr-1.5" />
                  {t('createCampaign')}
                </Button>
              </Link>
            </div>

            {/* Organizer stat cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard
                title={t('totalRaised')}
                value={formatUZS(organizerData.totals.total_raised)}
                icon={TrendingUp}
                colorClass="bg-blue-50 text-blue-600"
              />
              <StatCard
                title={t('availableBalance')}
                value={formatUZS(organizerData.totals.total_available)}
                icon={Wallet}
                colorClass="bg-green-50 text-green-600"
              />
              <StatCard
                title={t('totalWithdrawn')}
                value={formatUZS(organizerData.totals.total_withdrawn)}
                icon={ArrowUpRight}
                colorClass="bg-purple-50 text-purple-600"
              />
              <StatCard
                title={t('pendingWithdrawals')}
                value={formatUZS(organizerData.totals.total_pending_withdrawals)}
                icon={Clock}
                colorClass="bg-yellow-50 text-yellow-600"
              />
            </div>

            {/* Campaign cards */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">{t('campaignStats')}</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {organizerData.campaigns.map((campaign: CampaignWithBalance) => (
                  <OrganizerCampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Personalized Feed — "For You" section */}
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
