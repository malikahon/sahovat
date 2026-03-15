'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Users, Calendar, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatUZS } from '@/lib/formatters';
import type { CampaignWithStats } from '@/lib/types';

function getDaysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function CampaignCard({
  campaign,
}: {
  campaign: CampaignWithStats;
}) {
  const t = useTranslations('campaigns');
  const daysLeft = getDaysRemaining(campaign.end_date);

  return (
    <Link href={`/campaigns/${campaign.id}`} className="group block">
      <Card className="h-full overflow-hidden border-border/50 bg-card/80 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/10 sage-glow">
        {/* Cover image */}
        <div className="relative aspect-video overflow-hidden">
          {campaign.cover_image_url ? (
            <Image
              src={campaign.cover_image_url}
              alt={campaign.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <span className="text-3xl font-bold text-primary/30">
                {campaign.title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Gradient overlay for readability */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />

          {/* Category badge */}
          <Badge
            variant="secondary"
            className="absolute right-2 top-2 border-none bg-background/70 text-xs backdrop-blur-sm"
          >
            {t(`categories.${campaign.category}`)}
          </Badge>

          {/* Verified badge */}
          {campaign.is_verified && (
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-medium text-primary-foreground backdrop-blur-sm">
              <CheckCircle className="size-3" />
              {t('verified')}
            </div>
          )}
        </div>

        <CardContent className="flex flex-1 flex-col gap-3">
          {/* Title */}
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
            {campaign.title}
          </h3>

          {/* Description preview */}
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {campaign.description}
          </p>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-primary">
                {Math.round(campaign.progress_percentage)}%
              </span>
              <span>
                {t('goal')}: {formatUZS(campaign.goal_amount)}
              </span>
            </div>
            <Progress value={Math.min(campaign.progress_percentage, 100)} />
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {formatUZS(campaign.current_amount)} {t('raised').toLowerCase()}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {campaign.donor_count} {t('donors').toLowerCase()}
            </span>
          </div>

          {/* Days remaining */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="size-3" />
            {daysLeft !== null ? (
              <span>
                {daysLeft} {t('daysLeft')}
              </span>
            ) : (
              <span>{t('noEndDate')}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
