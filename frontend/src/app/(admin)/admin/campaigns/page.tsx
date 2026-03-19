'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Search, ArrowRight } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatUZS } from '@/lib/formatters';
import { CampaignStatus, CampaignCategory } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const STATUS_COLORS: Record<string, string> = {
  pending_review: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  draft: 'bg-gray-100 text-gray-700',
  paused: 'bg-blue-100 text-blue-800',
  frozen: 'bg-red-100 text-red-800',
  completed: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

const PAGE_SIZE = 20;

export default function AdminCampaignsPage() {
  const t = useTranslations('admin.campaigns');

  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  const handleSearchChange = (val: string) => {
    setSearch(val);
    clearTimeout((handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer);
    (handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'campaigns', tab, debouncedSearch, category, page],
    queryFn: () =>
      adminApi.listCampaigns({
        status: tab === 'pending' ? CampaignStatus.PENDING_REVIEW : undefined,
        search: debouncedSearch || undefined,
        category: (category as CampaignCategory) || undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const campaigns = data?.campaigns ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.total_pages ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
      </div>

      {/* Tabs: Pending vs All */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v as 'pending' | 'all'); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="pending">{t('verificationQueue')}</TabsTrigger>
          <TabsTrigger value="all">{t('allCampaigns')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={t('campaignTitle') + '...'}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category || '_all'} onValueChange={(v: string | null) => { setCategory(!v || v === '_all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t('filterByCategory')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">{t('allCampaigns')}</SelectItem>
            {Object.values(CampaignCategory).map((cat) => (
              <SelectItem key={cat} value={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('campaignTitle')}</TableHead>
              <TableHead>{t('creator')}</TableHead>
              <TableHead>{t('category')}</TableHead>
              <TableHead>{t('goalAmount')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead>{t('verified')}</TableHead>
              <TableHead>{t('documentCount')}</TableHead>
              <TableHead>{t('createdAt')}</TableHead>
              <TableHead className="w-12">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(9)].map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No campaigns found.
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium max-w-48 truncate">{c.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.creator_display_name || c.creator_phone}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">
                      {c.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{formatUZS(c.goal_amount)}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? ''}`}
                    >
                      {c.status.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    {c.is_verified ? (
                      <Badge className="bg-green-500 text-white text-xs">✓</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">—</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.document_count}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/campaigns/${c.id}`}>
                      <Button variant="ghost" size="icon" className="size-8">
                        <ArrowRight className="size-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({pagination?.total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
