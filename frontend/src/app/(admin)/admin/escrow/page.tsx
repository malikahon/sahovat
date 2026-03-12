'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Vault, TrendingDown, TrendingUp } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatUZS } from '@/lib/formatters';
import { StatCard } from '@/components/admin/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

export default function AdminEscrowPage() {
  const t = useTranslations('admin.escrow');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'escrow'],
    queryFn: () => adminApi.getEscrow(),
  });

  const escrow = data?.data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('escrowDescription')}</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title={t('totalEscrow')}
          value={escrow ? formatUZS(escrow.total_escrow_balance) : '—'}
          icon={<Vault className="size-4" />}
          loading={isLoading}
        />
        <StatCard
          title={t('platformRevenue')}
          value={escrow ? formatUZS(escrow.total_platform_revenue) : '—'}
          icon={<TrendingUp className="size-4" />}
          loading={isLoading}
        />
        <StatCard
          title={t('totalWithdrawn')}
          value={escrow ? formatUZS(escrow.total_withdrawn) : '—'}
          icon={<TrendingDown className="size-4" />}
          loading={isLoading}
        />
      </div>

      {/* Per-campaign balances */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('perCampaign')}</CardTitle>
          <CardDescription>
            {escrow?.campaign_balances.length ?? 0} campaigns with donations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !escrow?.campaign_balances.length ? (
            <p className="text-sm text-muted-foreground py-4">No campaigns with donations yet.</p>
          ) : (
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('campaignTitle')}</TableHead>
                    <TableHead className="text-right">{t('totalDonated')}</TableHead>
                    <TableHead className="text-right">{t('totalFees')}</TableHead>
                    <TableHead className="text-right">{t('totalWithdrawnCol')}</TableHead>
                    <TableHead className="text-right">{t('availableBalance')}</TableHead>
                    <TableHead className="w-32">Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {escrow.campaign_balances.map((c) => {
                    const withdrawnPct = c.total_donated > 0
                      ? Math.round((c.total_withdrawn / c.total_donated) * 100)
                      : 0;
                    return (
                      <TableRow key={c.campaign_id}>
                        <TableCell className="font-medium max-w-48 truncate">
                          {c.campaign_title}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatUZS(c.total_donated)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatUZS(c.total_fees)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatUZS(c.total_withdrawn)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-green-600">
                          {formatUZS(c.available_balance)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={withdrawnPct} className="flex-1 h-2" />
                            <span className="text-xs text-muted-foreground w-8">
                              {withdrawnPct}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
