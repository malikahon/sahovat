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
  Heart,
  MapPin,
  Share2,
  Users,
} from 'lucide-react';
import { campaignsApi, donationsApi } from '@/lib/api';
import { CampaignStatus, DonationStatus } from '@/lib/types';
import type { CampaignDocument, Donation } from '@/lib/types';
import { formatUZS, formatDate } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { CampaignProgressBar } from '@/components/campaign/CampaignProgressBar';
import { CampaignStatusBadge } from '@/components/campaign/CampaignStatusBadge';
import { DonationBottomSheet } from '@/components/donation/DonationBottomSheet';
import { useAuth } from '@/hooks/useAuth';

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

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ============================================================
// Loading Skeleton
// ============================================================

function CampaignDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Skeleton className="mb-6 h-8 w-40" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
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
        <h2 className="text-xl font-semibold text-foreground">{t('detail.notFound')}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{t('detail.notFoundDescription')}</p>
        <Button variant="outline" className="mt-6" render={<Link href="/campaigns" />}>
          {t('detail.backToBrowse')}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Donation list (comment-section style)
// ============================================================

function DonationList({ campaignId }: { campaignId: string }) {
  const tDonations = useTranslations('donations');
  const [showAll, setShowAll] = useState(false);
  const INITIAL_LIMIT = 5;

  const { data, isLoading } = useQuery({
    queryKey: ['campaign-donations', campaignId],
    queryFn: async () => {
      const res = await donationsApi.listByCampaign(campaignId, { limit: 20 });
      return res.data ?? [];
    },
    enabled: !!campaignId,
  });

  const donations = data ?? [];
  const completedDonations = donations.filter(
    (d: Donation) => d.status === DonationStatus.COMPLETED,
  );
  const visible = showAll ? completedDonations : completedDonations.slice(0, INITIAL_LIMIT);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (completedDonations.length === 0) {
    return (
      <div className="py-6 text-center">
        <Heart className="mx-auto mb-2 size-10 text-muted-foreground/30" />
        <p className="text-sm font-medium text-foreground">{tDonations('firstDonate')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{tDonations('firstDonateDescription')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visible.map((donation: Donation) => (
        <div key={donation.id} className="flex items-start gap-3">
          {/* Avatar placeholder */}
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {donation.is_anonymous
              ? '?'
              : (donation.donor_display_name ?? 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-foreground">
                {donation.is_anonymous ? tDonations('anonymousDonor') : (donation.donor_display_name || 'Someone')}
              </span>
              <span className="text-xs font-semibold text-primary">{formatUZS(donation.amount)}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {timeAgo(donation.completed_at ?? donation.created_at)}
              </span>
            </div>
            {donation.note && (
              <p className="mt-0.5 text-xs text-muted-foreground italic">"{donation.note}"</p>
            )}
          </div>
        </div>
      ))}

      {!showAll && completedDonations.length > INITIAL_LIMIT && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-sm text-primary hover:underline"
        >
          {tDonations('showMore')} ({completedDonations.length - INITIAL_LIMIT} more)
        </button>
      )}
    </div>
  );
}

// ============================================================
// Main Page Component
// ============================================================

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('campaigns');
  const tDonations = useTranslations('donations');
  const { user } = useAuth();

  const [shareCopied, setShareCopied] = useState(false);
  const [donationSheetOpen, setDonationSheetOpen] = useState(false);

  const {
    data: campaignData,
    isLoading: campaignLoading,
    isError: campaignError,
    refetch: refetchCampaign,
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

  const publicDocuments = (documentsData ?? []).filter(
    (doc: CampaignDocument) => !doc.is_private,
  );

  if (campaignLoading) return <CampaignDetailSkeleton />;
  if (campaignError || !campaignData) return <CampaignNotFound />;

  const campaign = campaignData;
  const daysInfo = getDaysRemaining(campaign.end_date);
  const canDonate = campaign.status === CampaignStatus.ACTIVE;

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
            <h1 className="text-2xl font-bold text-foreground lg:text-3xl">{campaign.title}</h1>
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
            <h2 className="mb-3 text-lg font-semibold text-foreground">{t('detail.description')}</h2>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {campaign.description}
            </div>
          </section>

          {/* Documents */}
          {publicDocuments.length > 0 && (
            <>
              <Separator />
              <section>
                <h2 className="mb-3 text-lg font-semibold text-foreground">{t('detail.documents')}</h2>
                <div className="space-y-2">
                  {publicDocuments.map((doc: CampaignDocument) => (
                    <Card key={doc.id} size="sm">
                      <CardContent className="flex items-center gap-3">
                        <FileText className="size-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</p>
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

          {/* Recent Donations section */}
          <Separator />
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              {tDonations('recentDonations')}
            </h2>
            <DonationList campaignId={id} />
          </section>
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
                <p className="text-lg font-bold text-foreground">{formatUZS(campaign.current_amount)}</p>
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

                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">{t(`categories.${campaign.category}`)}</Badge>
                </div>

                {campaign.region && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="size-4 text-muted-foreground" />
                    <span className="text-foreground">{t(`regions.${campaign.region}`)}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Actions */}
              <div className="space-y-2">
                {canDonate ? (
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={() => {
                      if (!user) {
                        window.location.href = '/login';
                        return;
                      }
                      setDonationSheetOpen(true);
                    }}
                  >
                    <Heart className="size-4" />
                    {tDonations('donateNow')}
                  </Button>
                ) : (
                  <Button className="w-full" size="lg" disabled>
                    {t('donate')}
                  </Button>
                )}

                <Button variant="outline" className="w-full" size="lg" onClick={handleShare}>
                  <Share2 className="size-4" />
                  {shareCopied ? t('detail.shareCopied') : t('detail.share')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Donation Bottom Sheet */}
      {donationSheetOpen && (
        <DonationBottomSheet
          campaignId={id}
          campaignTitle={campaign.title}
          isOpen={donationSheetOpen}
          onClose={() => {
            setDonationSheetOpen(false);
            // Refetch campaign to update raised amount
            refetchCampaign();
          }}
          userDisplayName={user?.display_name ?? null}
        />
      )}
    </div>
  );
}
