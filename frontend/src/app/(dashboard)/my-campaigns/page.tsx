'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  FolderHeart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { campaignsApi } from '@/lib/api';
import { CampaignStatus } from '@/lib/types';
import type { CampaignWithStats } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatUZS, formatDate } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

// ============================================================
// Constants
// ============================================================

const PAGE_LIMIT = 10;

const STATUS_FILTER_VALUES = [
  '',
  CampaignStatus.DRAFT,
  CampaignStatus.PENDING_REVIEW,
  CampaignStatus.ACTIVE,
  CampaignStatus.PAUSED,
  CampaignStatus.COMPLETED,
  CampaignStatus.CANCELLED,
];

// ============================================================
// Status badge styling
// ============================================================

const STATUS_BADGE_CONFIG: Record<
  CampaignStatus,
  { variant: 'outline' | 'secondary' | 'destructive' | 'default'; className?: string }
> = {
  [CampaignStatus.DRAFT]: { variant: 'outline' },
  [CampaignStatus.PENDING_REVIEW]: {
    variant: 'secondary',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
  [CampaignStatus.ACTIVE]: {
    variant: 'secondary',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  [CampaignStatus.PAUSED]: { variant: 'secondary' },
  [CampaignStatus.COMPLETED]: {
    variant: 'secondary',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  [CampaignStatus.CANCELLED]: { variant: 'destructive' },
  [CampaignStatus.FROZEN]: { variant: 'destructive' },
};

// ============================================================
// Campaign Card
// ============================================================

function CampaignCard({
  campaign,
  onDelete,
  isDeleting,
}: {
  campaign: CampaignWithStats;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const t = useTranslations('campaigns');
  const badgeConfig = STATUS_BADGE_CONFIG[campaign.status];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row">
        {/* Thumbnail */}
        <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
          {campaign.cover_image_url ? (
            <Image
              src={campaign.cover_image_url}
              alt={campaign.title}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <FolderHeart className="size-8 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* Top row: title + badges */}
          <div className="flex flex-wrap items-start gap-2">
            <h3 className="text-sm font-medium text-foreground line-clamp-1">
              {campaign.title}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant={badgeConfig.variant}
                className={badgeConfig.className}
              >
                {t(`status.${campaign.status}`)}
              </Badge>
              <Badge variant="outline">
                {t(`categories.${campaign.category}`)}
              </Badge>
            </div>
          </div>

          {/* Goal + progress */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
              <span>
                {t('raised')}: {formatUZS(campaign.current_amount)}
              </span>
              <span>/</span>
              <span>
                {t('goal')}: {formatUZS(campaign.goal_amount)}
              </span>
              <span className="ml-auto tabular-nums">
                {Math.round(campaign.progress_percentage)}%
              </span>
            </div>
            <Progress value={campaign.progress_percentage} />
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              {t('donors')}: {campaign.donor_count}
            </span>
            <span>{formatDate(campaign.created_at)}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 flex-row gap-1 self-start sm:flex-col">
          {campaign.status === CampaignStatus.DRAFT && (
            <>
              <Button variant="outline" size="sm" render={<Link href={`/create-campaign/step-1?id=${campaign.id}`} />}>
                <Pencil className="size-3.5" />
                {t('myCampaigns.editDraft')}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                onClick={() => {
                  if (window.confirm(t('myCampaigns.deleteConfirm'))) {
                    onDelete(campaign.id);
                  }
                }}
              >
                {isDeleting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                {t('myCampaigns.deleteDraft')}
              </Button>
            </>
          )}
          {campaign.status === CampaignStatus.ACTIVE && (
            <Button variant="outline" size="sm" render={<Link href={`/campaigns/${campaign.id}/manage`} />}>
              <Eye className="size-3.5" />
              {t('myCampaigns.manage')}
            </Button>
          )}
          {campaign.status !== CampaignStatus.DRAFT &&
            campaign.status !== CampaignStatus.ACTIVE && (
              <Badge
                variant={badgeConfig.variant}
                className={cn('self-start', badgeConfig.className)}
              >
                {t(`status.${campaign.status}`)}
              </Badge>
            )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Skeleton Loading Cards
// ============================================================

function CampaignCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex gap-4">
        <Skeleton className="size-20 shrink-0 rounded-lg" />
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-1 w-full rounded-full" />
          <div className="flex gap-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-7 w-24 shrink-0 rounded-lg" />
      </CardContent>
    </Card>
  );
}

// ============================================================
// Main Page
// ============================================================

export default function MyCampaignsPage() {
  const t = useTranslations('campaigns');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Reset page when filter changes
  const handleFilterChange = (value: string | null) => {
    setStatusFilter(value ?? '');
    setPage(1);
  };

  // ---- Query ----

  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['my-campaigns', user?.id, statusFilter, page],
    queryFn: () =>
      campaignsApi.list({
        creator_id: user!.id,
        status: statusFilter ? (statusFilter as CampaignStatus) : undefined,
        page,
        limit: PAGE_LIMIT,
        sort_by: 'created_at',
        sort_order: 'desc',
      }),
    enabled: !!user?.id,
  });

  const campaigns = response?.data ?? [];
  const pagination = response?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  // ---- Delete mutation ----

  const deleteMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.delete(id),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['my-campaigns'] });
      }
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('myCampaigns.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('myCampaigns.subtitle')}
          </p>
        </div>
        <Button render={<Link href="/create-campaign" />}>
          <Plus className="size-4" />
          {t('myCampaigns.createNew')}
        </Button>
      </div>

      {/* Status filter */}
      <Select value={statusFilter} onValueChange={handleFilterChange}>
        <SelectTrigger className="w-full sm:w-52">
          <SelectValue placeholder={t('myCampaigns.allStatuses')} />
        </SelectTrigger>
        <SelectContent>
          {STATUS_FILTER_VALUES.map((status) => (
            <SelectItem key={status || '_all'} value={status}>
              {status === ''
                ? t('myCampaigns.allStatuses')
                : t(`status.${status}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CampaignCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-destructive">
              Something went wrong. Please try again.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !isError && campaigns.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderHeart className="mb-3 size-12 text-muted-foreground/40" />
            <p className="font-medium text-foreground">
              {t('myCampaigns.empty')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('myCampaigns.emptyDescription')}
            </p>
            <Button className="mt-4" render={<Link href="/create-campaign" />}>
              <Plus className="size-4" />
              {t('myCampaigns.createNew')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Campaign list */}
      {!isLoading && !isError && campaigns.length > 0 && (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onDelete={(id) => deleteMutation.mutate(id)}
              isDeleting={
                deleteMutation.isPending &&
                deleteMutation.variables === campaign.id
              }
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
