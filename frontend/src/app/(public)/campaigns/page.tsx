'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { campaignsApi } from '@/lib/api';
import {
  CampaignCategory,
  CampaignStatus,
  UzbekRegion,
} from '@/lib/types';
import type { CampaignListQuery } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import CampaignCard from '@/components/campaign/CampaignCard';

const ITEMS_PER_PAGE = 12;

type SortOption = {
  sort_by: CampaignListQuery['sort_by'];
  sort_order: CampaignListQuery['sort_order'];
  labelKey: string;
};

const SORT_OPTIONS: SortOption[] = [
  { sort_by: 'created_at', sort_order: 'desc', labelKey: 'browse.sortNewest' },
  { sort_by: 'current_amount', sort_order: 'desc', labelKey: 'browse.sortMostFunded' },
  { sort_by: 'goal_amount', sort_order: 'desc', labelKey: 'browse.sortGoalAmount' },
  { sort_by: 'end_date', sort_order: 'asc', labelKey: 'browse.sortEndingSoon' },
  { sort_by: 'urgency', sort_order: 'desc', labelKey: 'browse.sortUrgency' },
];

function CampaignCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-1 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const t = useTranslations('campaigns');
  const { isAuthenticated } = useAuth();

  // Filter state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');
  const [sortIndex, setSortIndex] = useState(0);
  const [page, setPage] = useState(1);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [category, region, sortIndex]);

  // Build query object
  const query = useMemo<CampaignListQuery>(() => {
    const sort = SORT_OPTIONS[sortIndex];
    return {
      page,
      limit: ITEMS_PER_PAGE,
      status: CampaignStatus.ACTIVE,
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(category && { category: category as CampaignCategory }),
      ...(region && { region: region as UzbekRegion }),
      sort_by: sort.sort_by,
      sort_order: sort.sort_order,
    };
  }, [page, debouncedSearch, category, region, sortIndex]);

  // Fetch campaigns
  const { data, isLoading, isError } = useQuery({
    queryKey: ['campaigns', query],
    queryFn: () => campaignsApi.list(query),
  });

  const campaigns = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t('browse.title')}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {t('browse.subtitle')}
          </p>
        </div>
        {isAuthenticated && (
          <Button render={<Link href="/create-campaign" />}>
            {t('create')}
          </Button>
        )}
      </div>

      {/* Filters bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('browse.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Category filter */}
        <Select
          value={category}
          onValueChange={(val) => setCategory(val ?? '')}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={t('browse.allCategories')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('browse.allCategories')}</SelectItem>
            {Object.values(CampaignCategory).map((cat) => (
              <SelectItem key={cat} value={cat} label={t(`categories.${cat}`)}>
                {t(`categories.${cat}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Region filter */}
        <Select
          value={region}
          onValueChange={(val) => setRegion(val ?? '')}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={t('browse.allRegions')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('browse.allRegions')}</SelectItem>
            {Object.values(UzbekRegion).map((reg) => (
              <SelectItem key={reg} value={reg} label={t(`regions.${reg}`)}>
                {t(`regions.${reg}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={String(sortIndex)}
          onValueChange={(val) => setSortIndex(Number(val ?? 0))}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={t('browse.sortBy')} />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt, idx) => (
              <SelectItem key={idx} value={String(idx)}>
                {t(opt.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CampaignCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-destructive">
            Something went wrong. Please try again.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && campaigns.length === 0 && (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <p className="text-lg font-medium text-foreground">
            {t('browse.noCampaigns')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('browse.noCampaignsDescription')}
          </p>
        </div>
      )}

      {/* Campaign grid */}
      {!isLoading && !isError && campaigns.length > 0 && (
        <>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
                {t('browse.previous')}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t('browse.pageOf', { page, totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('browse.next')}
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
