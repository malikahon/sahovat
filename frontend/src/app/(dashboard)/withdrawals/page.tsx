'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { withdrawalsApi } from '@/lib/api';
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
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================
// STATUS BADGE
// ============================================================

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('withdrawals.status');
  const colorMap: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-blue-100 text-blue-700',
    rejected: 'bg-red-100 text-red-700',
    completed: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {t(status as 'pending' | 'approved' | 'rejected' | 'completed')}
    </span>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function WithdrawalsPage() {
  const t = useTranslations('withdrawals');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['my-withdrawals', page],
    queryFn: async () => {
      const res = await withdrawalsApi.listMy({ page, limit: 20 });
      if (!res.success) throw new Error(res.error ?? 'Failed to load');
      return res;
    },
  });

  const withdrawals = data?.withdrawals ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('history')}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : withdrawals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t('noHistory')}</p>
            <Link href="/dashboard" className="mt-2 text-sm text-primary hover:underline">
              Go to Dashboard
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('campaign')}</TableHead>
                <TableHead className="text-right">{t('requestedAmount')}</TableHead>
                <TableHead className="text-right">{t('platformFee')}</TableHead>
                <TableHead className="text-right">{t('netReceived')}</TableHead>
                <TableHead>{t('cardMasked')}</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="max-w-[200px]">
                    <p className="text-sm font-medium truncate">{w.campaign_title}</p>
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
                  <TableCell className="font-mono text-xs">
                    {w.card_number_masked}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={w.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(w.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {(pagination?.total_pages ?? 0) > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground py-1.5 px-2">
            {page} / {pagination?.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= (pagination?.total_pages ?? 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
