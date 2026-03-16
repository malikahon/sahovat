'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { CampaignStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
  className?: string;
}

const statusVariantMap: Record<CampaignStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  [CampaignStatus.DRAFT]: 'outline',
  [CampaignStatus.PENDING_REVIEW]: 'outline',
  [CampaignStatus.ACTIVE]: 'default',
  [CampaignStatus.PAUSED]: 'secondary',
  [CampaignStatus.COMPLETED]: 'default',
  [CampaignStatus.CANCELLED]: 'destructive',
  [CampaignStatus.FROZEN]: 'destructive',
};

const statusColorMap: Record<CampaignStatus, string> = {
  [CampaignStatus.DRAFT]: '',
  [CampaignStatus.PENDING_REVIEW]: 'border-amber-300 text-amber-700',
  [CampaignStatus.ACTIVE]: 'bg-green-600 text-white',
  [CampaignStatus.PAUSED]: '',
  [CampaignStatus.COMPLETED]: '',
  [CampaignStatus.CANCELLED]: '',
  [CampaignStatus.FROZEN]: '',
};

export function CampaignStatusBadge({ status, className }: CampaignStatusBadgeProps) {
  const t = useTranslations('campaigns');

  return (
    <Badge
      variant={statusVariantMap[status]}
      className={cn(statusColorMap[status], className)}
    >
      {t(`status.${status}`)}
    </Badge>
  );
}
