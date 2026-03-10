'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  FileText,
  MapPin,
  Share2,
  Users,
} from 'lucide-react';
import { campaignsApi } from '@/lib/api';
import { CampaignStatus } from '@/lib/types';
import type { CampaignDocument } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatUZS } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { CampaignProgressBar } from '@/components/campaign/CampaignProgressBar';
import { CampaignStatusBadge } from '@/components/campaign/CampaignStatusBadge';

// ============================================================
// Helpers
// ============================================================

function getDaysRemaining(endDate: string | null): { label: string; value: number | null } {
  if (!endDate) return { label: 'noEndDate', value: null };
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: 'ended', value: diff };
  return { label: 'daysLeft', value: diff };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================================
// Loading Skeleton
// ============================================================

function CampaignDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Top bar */}
      <Skeleton className="mb-6 h-8 w-40" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Error / Not Found
// ============================================================

function CampaignNotFound() {
  const t = useTranslations('campaigns');

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link
        href="/campaigns"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t('detail.backToBrowse')}
      </Link>

      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="mb-4 size-16 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold text-foreground">
          {t('detail.notFound')}
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {t('detail.notFoundDescription')}
        </p>
        <Button variant="outline" className="mt-6" render={<Link href="/campaigns" />}>
          {t('detail.backToBrowse')}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Main Page Component
// ============================================================

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('campaigns');
  const [shareCopied, setShareCopied] = useState(false);

  const {
    data: campaignData,
    isLoading: campaignLoading,
    isError: campaignError,
  } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const result = await campaignsApi.get(id);
      if (!result.success || !result.data) throw new Error(result.error || 'Not found');
      return result.data.campaign;
    },
    enabled: !!id,
  });

  const { data: documentsData } = useQuery({
    queryKey: ['campaign-documents', id],
    queryFn: async () => {
      const result = await campaignsApi.listDocuments(id);
      if (!result.success || !result.data) return [];
      return result.data.documents;
    },
    enabled: !!id,
  });

  // Filter out private documents
  const publicDocuments = (documentsData ?? []).filter(
    (doc: CampaignDocument) => !doc.is_private,
  );

  if (campaignLoading) return <CampaignDetailSkeleton />;
  if (campaignError || !campaignData) return <CampaignNotFound />;

  const campaign = campaignData;
  const daysInfo = getDaysRemaining(campaign.end_date);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Top bar */}
      <Link
        href="/campaigns"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t('detail.backToBrowse')}
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ==================== Main Content ==================== */}
        <div className="space-y-6 lg:col-span-2">
          {/* Cover image */}
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
            {campaign.cover_image_url ? (
              <Image
                src={campaign.cover_image_url}
                alt={campaign.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 66vw"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <FileText className="size-16 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Title & meta */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
              {campaign.title}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {campaign.creator_display_name && (
                <span>
                  {t('detail.by')} {campaign.creator_display_name}
                </span>
              )}

              {campaign.status !== CampaignStatus.ACTIVE && (
                <CampaignStatusBadge status={campaign.status} />
              )}

              {campaign.is_verified && (
                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle className="size-4" />
                  {t('verified')}
                </span>
              )}
            </div>
          </div>

          <Separator />

          {/* Description */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {t('detail.description')}
            </h2>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {campaign.description}
            </div>
          </section>

          {/* Documents */}
          {publicDocuments.length > 0 && (
            <>
              <Separator />
              <section>
                <h2 className="mb-3 text-lg font-semibold text-foreground">
                  {t('detail.documents')}
                </h2>
                <div className="space-y-2">
                  {publicDocuments.map((doc: CampaignDocument) => (
                    <Card key={doc.id} size="sm">
                      <CardContent className="flex items-center gap-3">
                        <FileText className="size-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {doc.file_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(doc.file_size)}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {t(`wizard.documentTypes.${doc.document_type}`)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          render={<a href={doc.file_url} target="_blank" rel="noopener noreferrer" />}
                        >
                          {t('detail.viewDocument')}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>

        {/* ==================== Sidebar ==================== */}
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4">
              {/* Progress */}
              <CampaignProgressBar
                currentAmount={campaign.current_amount}
                goalAmount={campaign.goal_amount}
              />

              {/* Amount raised */}
              <div>
                <p className="text-lg font-bold text-foreground">
                  {formatUZS(campaign.current_amount)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('detail.progress', { goal: formatUZS(campaign.goal_amount) })}
                </p>
              </div>

              <Separator />

              {/* Stats */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="size-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {campaign.donor_count} {t('donors')}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="size-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {daysInfo.value !== null && daysInfo.value >= 0
                      ? `${daysInfo.value} ${t('daysLeft')}`
                      : t(daysInfo.label)}
                  </span>
                </div>

                {/* Category */}
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">
                    {t(`categories.${campaign.category}`)}
                  </Badge>
                </div>

                {/* Region */}
                {campaign.region && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="size-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {t(`regions.${campaign.region}`)}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Actions */}
              <div className="space-y-2">
                <Button className="w-full" size="lg" disabled>
                  {t('donate')} — {t('detail.comingSoon')}
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  size="lg"
                  onClick={handleShare}
                >
                  <Share2 className="size-4" />
                  {shareCopied ? t('detail.shareCopied') : t('detail.share')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
