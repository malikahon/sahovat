'use client';

import { useTranslations } from 'next-intl';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface CampaignProgressBarProps {
  currentAmount: number;
  goalAmount: number;
  className?: string;
}

export function CampaignProgressBar({
  currentAmount,
  goalAmount,
  className,
}: CampaignProgressBarProps) {
  const t = useTranslations('campaigns');
  const percentage = goalAmount > 0 ? Math.min(Math.round((currentAmount / goalAmount) * 100), 100) : 0;

  return (
    <div className={cn('space-y-1.5', className)}>
      <Progress value={percentage} />
      <p className="text-sm text-muted-foreground">
        {percentage}% {t('detail.funded')}
      </p>
    </div>
  );
}
