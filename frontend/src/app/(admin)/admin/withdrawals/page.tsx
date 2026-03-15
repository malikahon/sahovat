'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { formatUZS, formatDate } from '@/lib/formatters';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AdminWithdrawalListItem } from '@/lib/types';

// ============================================================
// STATUS BADGE
// ============================================================

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-blue-100 text-blue-700',
    rejected: 'bg-red-100 text-red-700',
    completed: 'bg-green-100 text-green-700',
  };
  const t = useTranslations('admin.withdrawals');
  const labelMap: Record<string, string> = {
    pending: t('pendingTab'),
    approved: 'Approved',
    rejected: 'Rejected',
    completed: 'Completed',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labelMap[status] ?? status}
    </span>
  );
}

// ============================================================
// WITHDRAWALS TABLE
// ============================================================

function WithdrawalsTable({
  withdrawals,
  isLoading,
}: {
  withdrawals: AdminWithdrawalListItem[];
  isLoading: boolean;
}) {
  const t = useTranslations('admin.withdrawals');

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (withdrawals.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        {t('noWithdrawals')}
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('organizer')}</TableHead>
            <TableHead>{t('campaign')}</TableHead>
            <TableHead className="text-right">{t('requestedAmount')}</TableHead>
            <TableHead className="text-right">{t('platformFee')}</TableHead>
            <TableHead className="text-right">{t('netAmount')}</TableHead>
            <TableHead>{t('status')}</TableHead>
            <TableHead>{t('requestedAt')}</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {withdrawals.map((w) => (
            <TableRow key={w.id}>
              <TableCell>
                <div>
                  <p className="text-sm font-medium">{w.organizer_display_name ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">{w.organizer_phone}</p>
                </div>
              </TableCell>
              <TableCell className="max-w-[200px]">
                <p className="text-sm truncate">{w.campaign_title}</p>
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatUZS(w.amount)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm text-red-600">
                {formatUZS(w.platform_fee)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm font-semibold text-green-600">
                {formatUZS(w.net_amount)}
              </TableCell>
              <TableCell>
                <StatusBadge status={w.status} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatDate(w.created_at)}
              </TableCell>
              <TableCell>
                <Link href={`/admin/withdrawals/${w.id}`}>
                  <Button size="sm" variant="outline" className="text-xs h-7">
                    Review
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function AdminWithdrawalsPage() {
  const t = useTranslations('admin.withdrawals');
  const [page, setPage] = useState(1);

  const pendingQuery = useQuery({
    queryKey: ['admin-withdrawals', 'pending', page],
    queryFn: async () => {
      const res = await adminApi.listWithdrawals({ status: 'pending', page, limit: 20 });
      if (!res.success) throw new Error('Failed to load');
      return res;
    },
  });

  const allQuery = useQuery({
    queryKey: ['admin-withdrawals', 'all', page],
    queryFn: async () => {
      const res = await adminApi.listWithdrawals({ page, limit: 20 });
      if (!res.success) throw new Error('Failed to load');
      return res;
    },
  });

  const pendingCount = pendingQuery.data?.pagination?.total ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        {pendingCount > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            {pendingCount} request{pendingCount !== 1 ? 's' : ''} pending review
          </p>
        )}
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            {t('pendingTab')}
            {pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-yellow-100 text-yellow-700 px-1.5 py-0.5 text-xs font-medium">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">{t('allTab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <WithdrawalsTable
            withdrawals={pendingQuery.data?.withdrawals ?? []}
            isLoading={pendingQuery.isLoading}
          />
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <WithdrawalsTable
            withdrawals={allQuery.data?.withdrawals ?? []}
            isLoading={allQuery.isLoading}
          />
          {/* Pagination */}
          {(allQuery.data?.pagination?.total_pages ?? 0) > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground py-1.5 px-2">
                {page} / {allQuery.data?.pagination?.total_pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= (allQuery.data?.pagination?.total_pages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
