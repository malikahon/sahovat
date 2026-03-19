'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Users,
  FolderKanban,
  Clock,
  TrendingUp,
  TrendingDown,
  Banknote,
  AlertCircle,
  ArrowRight,
  Vault,
  ArrowDownToLine,
  Wallet,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatUZS } from '@/lib/formatters';
import { StatCard } from '@/components/admin/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
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

function formatWeekLabel(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** Percentage change helper — returns null if previous is 0 */
function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
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

  const { data: moneyFlowData, isLoading: moneyFlowLoading } = useQuery({
    queryKey: ['admin', 'money-flow'],
    queryFn: () => adminApi.getMoneyFlow(),
  });

  const { data: auditData } = useQuery({
    queryKey: ['admin', 'audit-log', 'recent'],
    queryFn: () => adminApi.getAuditLog({ limit: 5 }),
  });

  const stats = statsData?.data;
  const mf = moneyFlowData?.data;

  const donationPctChange = mf
    ? pctChange(mf.this_month.donations, mf.last_month.donations)
    : null;
  const feePctChange = mf
    ? pctChange(mf.this_month.fees, mf.last_month.fees)
    : null;

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

      {/* Money Flow Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('moneyFlow')}</CardTitle>
          <CardDescription>{t('moneyFlowDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {moneyFlowLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : mf ? (
            <div className="space-y-6">
              {/* Flow visualization */}
              <div className="grid gap-3 sm:grid-cols-5 items-center">
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{t('grossDonations')}</p>
                  <p className="text-sm font-bold text-foreground">{formatUZS(mf.gross_donations)}</p>
                </div>
                <div className="hidden sm:flex items-center justify-center">
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{t('platformFeesCollected')}</p>
                  <p className="text-sm font-bold text-primary">{formatUZS(mf.total_platform_fees)}</p>
                  <div className="mt-1 flex justify-center gap-2 text-[10px] text-muted-foreground">
                    <span>{t('fromDonations')}: {formatUZS(mf.fee_breakdown.from_donations)}</span>
                    {mf.fee_breakdown.from_withdrawals > 0 && (
                      <span>{t('fromWithdrawals')}: {formatUZS(mf.fee_breakdown.from_withdrawals)}</span>
                    )}
                  </div>
                </div>
                <div className="hidden sm:flex items-center justify-center">
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{t('netToCampaigns')}</p>
                  <p className="text-sm font-bold text-foreground">{formatUZS(mf.net_to_campaigns)}</p>
                </div>
              </div>

              {/* Monthly comparison + Escrow + Withdrawals */}
              <div className="grid gap-4 sm:grid-cols-3">
                {/* Monthly comparison */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">{t('monthlyComparison')}</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t('thisMonth')}</span>
                      <span className="text-sm font-semibold">{formatUZS(mf.this_month.donations)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t('lastMonth')}</span>
                      <span className="text-sm text-muted-foreground">{formatUZS(mf.last_month.donations)}</span>
                    </div>
                    {donationPctChange !== null && (
                      <div className="flex items-center gap-1 pt-1">
                        {donationPctChange >= 0 ? (
                          <TrendingUp className="size-3 text-green-600" />
                        ) : (
                          <TrendingDown className="size-3 text-red-500" />
                        )}
                        <span className={`text-xs font-medium ${donationPctChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {donationPctChange > 0 ? '+' : ''}{donationPctChange}%
                        </span>
                        <span className="text-xs text-muted-foreground">{t('vsLastMonth')}</span>
                      </div>
                    )}
                    <div className="border-t border-border pt-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{t('feesThisMonth')}</span>
                        <span className="text-xs font-medium text-primary">{formatUZS(mf.this_month.fees)}</span>
                      </div>
                      {feePctChange !== null && (
                        <div className="flex items-center gap-1 mt-1">
                          {feePctChange >= 0 ? (
                            <TrendingUp className="size-3 text-green-600" />
                          ) : (
                            <TrendingDown className="size-3 text-red-500" />
                          )}
                          <span className={`text-xs font-medium ${feePctChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {feePctChange > 0 ? '+' : ''}{feePctChange}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Escrow Balance */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Vault className="size-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">{t('escrowBalance')}</h4>
                  </div>
                  <p className="text-lg font-bold text-foreground">{formatUZS(mf.escrow_balance)}</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t('totalWithdrawn')}</span>
                      <span>{formatUZS(mf.total_withdrawn)}</span>
                    </div>
                    {mf.escrow_balance + mf.total_withdrawn > 0 && (
                      <Progress
                        value={Math.round(
                          (mf.total_withdrawn / (mf.escrow_balance + mf.total_withdrawn)) * 100,
                        )}
                        className="h-1.5"
                      />
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {mf.escrow_balance + mf.total_withdrawn > 0
                        ? `${Math.round((mf.total_withdrawn / (mf.escrow_balance + mf.total_withdrawn)) * 100)}% ${t('disbursed')}`
                        : t('noDonationsYet')}
                    </p>
                  </div>
                </div>

                {/* Withdrawal Pipeline */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ArrowDownToLine className="size-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">{t('withdrawalPipeline')}</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-500/50 text-yellow-600">
                          {t('pending')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">({mf.withdrawals.pending_count})</span>
                      </div>
                      <span className="text-sm font-medium">{formatUZS(mf.withdrawals.pending_amount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/50 text-blue-600">
                          {t('approved')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">({mf.withdrawals.approved_count})</span>
                      </div>
                      <span className="text-sm font-medium">{formatUZS(mf.withdrawals.approved_amount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500/50 text-green-600">
                          {t('completed')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">({mf.withdrawals.completed_count})</span>
                      </div>
                      <span className="text-sm font-medium">{formatUZS(mf.withdrawals.completed_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Weekly Revenue Trend */}
              {mf.weekly_trend.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">{t('weeklyRevenueTrend')}</h4>
                  <ChartContainer
                    config={{
                      amount: { label: t('donations'), color: 'hsl(var(--primary))' },
                      fees: { label: t('fees'), color: 'hsl(var(--chart-2))' },
                    }}
                    className="h-40 w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mf.weekly_trend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="week_start"
                          tickFormatter={formatWeekLabel}
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
                              formatter={(value, name) => [
                                formatUZS(Number(value)),
                                name === 'fees' ? t('fees') : t('donations'),
                              ]}
                            />
                          }
                        />
                        <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="fees" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noData')}</p>
          )}
        </CardContent>
      </Card>

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
            <p className="text-sm text-muted-foreground">{t('noRecentActions')}</p>
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
                  {t('viewFullAuditLog')} →
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
