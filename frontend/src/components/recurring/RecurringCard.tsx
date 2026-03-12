'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pause, Play, XCircle, Trash2, AlertTriangle, FileText } from 'lucide-react';
import { recurringApi } from '@/lib/api';
import { RecurringStatus } from '@/lib/types';
import type { RecurringDonation } from '@/lib/types';
import { formatUZS, formatDate } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// ============================================================
// Status badge
// ============================================================

function RecurringStatusBadge({ status }: { status: RecurringStatus }) {
  const t = useTranslations('recurring');
  const variants: Record<RecurringStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    [RecurringStatus.ACTIVE]: 'default',
    [RecurringStatus.PAUSED]: 'secondary',
    [RecurringStatus.CANCELLED]: 'outline',
    [RecurringStatus.FAILED]: 'destructive',
  };
  return <Badge variant={variants[status]}>{t(`status.${status}`)}</Badge>;
}

// ============================================================
// RecurringCard
// ============================================================

interface Props {
  recurring: RecurringDonation & {
    campaign_title?: string | null;
    campaign_cover_image_url?: string | null;
  };
}

export function RecurringCard({ recurring }: Props) {
  const t = useTranslations('recurring');
  const tc = useTranslations('campaigns');
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<'pause' | 'cancel' | 'resume' | null>(null);

  const updateMutation = useMutation({
    mutationFn: (data: { status: string }) =>
      recurringApi.update(recurring.id, data as { status: RecurringStatus }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-recurring'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => recurringApi.delete(recurring.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-recurring'] });
    },
  });

  const handleAction = (action: 'pause' | 'resume' | 'cancel') => {
    const statusMap = {
      pause: RecurringStatus.PAUSED,
      resume: RecurringStatus.ACTIVE,
      cancel: RecurringStatus.CANCELLED,
    };
    updateMutation.mutate({ status: statusMap[action] });
    setConfirmAction(null);
  };

  const isActive = recurring.status === RecurringStatus.ACTIVE;
  const isPaused = recurring.status === RecurringStatus.PAUSED;
  const isFailed = recurring.status === RecurringStatus.FAILED;
  const isCancelled = recurring.status === RecurringStatus.CANCELLED;
  const canDelete = isCancelled || isPaused || isFailed;

  const frequencyLabel = recurring.frequency === 'weekly' ? t('perWeek') : t('perMonth');
  const displayTitle = recurring.campaign_id
    ? recurring.campaign_title ?? 'Unknown Campaign'
    : t('categoryBased', { category: tc(`categories.${recurring.category ?? 'other'}`) });

  return (
    <Card>
      <CardContent className="flex items-start gap-4 py-4">
        {/* Thumbnail */}
        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
          {recurring.campaign_id && (recurring as { campaign_cover_image_url?: string | null }).campaign_cover_image_url ? (
            <Image
              src={(recurring as { campaign_cover_image_url: string }).campaign_cover_image_url}
              alt={displayTitle}
              fill
              className="object-cover"
              sizes="56px"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <FileText className="size-6 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {recurring.campaign_id ? (
              <Link
                href={`/campaigns/${recurring.campaign_id}`}
                className="truncate text-sm font-medium text-foreground hover:underline"
              >
                {displayTitle}
              </Link>
            ) : (
              <span className="truncate text-sm font-medium text-foreground">{displayTitle}</span>
            )}
            <RecurringStatusBadge status={recurring.status} />
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {formatUZS(recurring.amount)} {frequencyLabel}
            </span>
            {isActive && recurring.next_charge_date && (
              <span>
                {t('nextCharge')}: {formatDate(recurring.next_charge_date)}
              </span>
            )}
            {recurring.last_charge_date && (
              <span>
                {t('lastCharge')}: {formatDate(recurring.last_charge_date)}
              </span>
            )}
          </div>

          {/* Failure warning */}
          {recurring.failure_count > 0 && (
            <div className="mt-1 flex items-center gap-1 text-xs text-destructive">
              <AlertTriangle className="size-3" />
              <span>{t('failureWarning', { count: recurring.failure_count })}</span>
            </div>
          )}

          {/* Actions */}
          <div className="mt-2 flex items-center gap-2">
            {isActive && (
              <AlertDialog open={confirmAction === 'pause'} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <AlertDialogTrigger>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => setConfirmAction('pause')}
                  >
                    <Pause className="size-3" />
                    {t('actions.pause')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('confirmPause')}</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleAction('pause')}>
                      {t('actions.pause')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {(isPaused || isFailed) && (
              <AlertDialog open={confirmAction === 'resume'} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <AlertDialogTrigger>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => setConfirmAction('resume')}
                  >
                    <Play className="size-3" />
                    {t('actions.resume')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('confirmResume')}</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleAction('resume')}>
                      {t('actions.resume')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {(isActive || isPaused || isFailed) && (
              <AlertDialog open={confirmAction === 'cancel'} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <AlertDialogTrigger>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                    onClick={() => setConfirmAction('cancel')}
                  >
                    <XCircle className="size-3" />
                    {t('actions.cancel')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('confirmCancel')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('confirmCancel')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Back</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => handleAction('cancel')}
                    >
                      {t('actions.cancel')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-muted-foreground"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="size-3" />
                {t('actions.delete')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
