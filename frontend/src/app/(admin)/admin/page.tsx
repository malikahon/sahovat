'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Users,
  FolderKanban,
  Clock,
  TrendingUp,
  Banknote,
  AlertCircle,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatUZS } from '@/lib/formatters';
import { StatCard } from '@/components/admin/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  ResponsiveContainer,
} from 'recharts';

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatCategory(cat: string) {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export default function AdminCockpitPage() {
  const t = useTranslations('admin.cockpit');

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
  });

  const { data: overTimeData, isLoading: overTimeLoading } = useQuery({
    queryKey: ['admin', 'donations-over-time'],
    queryFn: () => adminApi.getDonationsOverTime(30),
  });

  const { data: byCategoryData, isLoading: byCategoryLoading } = useQuery({
    queryKey: ['admin', 'donations-by-category'],
    queryFn: () => adminApi.getDonationsByCategory(),
  });

  const { data: auditData } = useQuery({
    queryKey: ['admin', 'audit-log', 'recent'],
    queryFn: () => adminApi.getAuditLog({ limit: 5 }),
  });

  const stats = statsData?.data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title={t('totalUsers')}
          value={stats?.total_users ?? 0}
          icon={<Users className="size-4" />}
          loading={statsLoading}
        />
        <StatCard
          title={t('activeCampaigns')}
          value={stats?.active_campaigns ?? 0}
          icon={<FolderKanban className="size-4" />}
          loading={statsLoading}
        />
        <StatCard
          title={t('pendingVerifications')}
          value={stats?.pending_campaigns_count ?? 0}
          icon={<Clock className="size-4" />}
          loading={statsLoading}
          className={
            (stats?.pending_campaigns_count ?? 0) > 0
              ? 'border-yellow-500/50'
              : undefined
          }
        />
        <StatCard
          title={t('totalRaised')}
          value={stats ? formatUZS(stats.total_donations_amount) : '—'}
          icon={<TrendingUp className="size-4" />}
          loading={statsLoading}
        />
        <StatCard
          title={t('platformFees')}
          value={stats ? formatUZS(stats.total_platform_fees) : '—'}
          icon={<Banknote className="size-4" />}
          loading={statsLoading}
        />
        <StatCard
          title={t('pendingWithdrawals')}
          value={stats?.pending_withdrawals_count ?? 0}
          icon={<AlertCircle className="size-4" />}
          loading={statsLoading}
          className={
            (stats?.pending_withdrawals_count ?? 0) > 0
              ? 'border-orange-500/50'
              : undefined
          }
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Donations over time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('donationsOverTime')}</CardTitle>
            <CardDescription>{t('last30Days')}</CardDescription>
          </CardHeader>
          <CardContent>
            {overTimeLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ChartContainer
                config={{
                  amount: { label: t('amount'), color: 'hsl(var(--primary))' },
                }}
                className="h-48 w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overTimeData?.data ?? []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [formatUZS(Number(value)), t('amount')]}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Donations by category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('donationsByCategory')}</CardTitle>
          </CardHeader>
          <CardContent>
            {byCategoryLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ChartContainer
                config={{
                  amount: { label: t('amount'), color: 'hsl(var(--primary))' },
                }}
                className="h-48 w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byCategoryData?.data ?? []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      tickFormatter={formatCategory}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={70}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [formatUZS(Number(value)), t('amount')]}
                        />
                      }
                    />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent admin actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('recentActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!auditData?.actions ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : auditData.actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent actions.</p>
          ) : (
            <div className="space-y-2">
              {auditData.actions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs font-mono">
                      {action.action_type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {action.admin_display_name || action.admin_phone}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      → {action.target_type}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(action.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="pt-2">
                <Link
                  href="/admin/audit"
                  className="text-xs text-primary hover:underline"
                >
                  View full audit log →
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
