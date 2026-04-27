import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Database } from 'lucide-react';
import {
  MarketingPage,
  Hero,
  Section,
  StatStrip,
  type StatItem,
} from '@/components/marketing';
import { fetchPublicStats } from '@/lib/public-stats';
import { formatUZS } from '@/lib/formatters';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.transparency');
  return { title: t('title'), description: t('description') };
}

// Static fee model — matches platform fee + processor fee defaults.
// 100,000 UZS donation → 95,000 to campaign, 2,000 platform fee, 3,000 processing.
const FEE_BARS: { key: 'campaign' | 'platform' | 'processing'; pct: number; tone: string }[] = [
  { key: 'campaign', pct: 95, tone: 'bg-primary' },
  { key: 'platform', pct: 2, tone: 'bg-amber-500' },
  { key: 'processing', pct: 3, tone: 'bg-muted-foreground/40' },
];

export default async function TransparencyPage() {
  const t = await getTranslations('pages.transparency');
  const tMk = await getTranslations('marketing');
  const stats = await fetchPublicStats();

  const statItems: StatItem[] = [
    {
      label: tMk('stats.activeCampaigns'),
      value: stats.active_campaigns.toLocaleString('en-US'),
    },
    {
      label: tMk('stats.donationsCount'),
      value: stats.completed_donations_count.toLocaleString('en-US'),
    },
    {
      label: tMk('stats.totalDonated'),
      value: formatUZS(Math.round(stats.total_donated_amount)),
    },
    {
      label: tMk('stats.totalWithdrawn'),
      value: formatUZS(Math.round(stats.total_withdrawn_amount)),
    },
    {
      label: tMk('stats.verifiedOrganizers'),
      value: stats.verified_organizers.toLocaleString('en-US'),
    },
    {
      label: tMk('stats.platformFees'),
      value: formatUZS(Math.round(stats.platform_fee_total)),
    },
  ];

  return (
    <MarketingPage>
      <Hero eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

      <Section title={t('liveTitle')} intro={t('liveIntro')}>
        <StatStrip stats={statItems.slice(0, 4)} />
        <div className="mt-4">
          <StatStrip stats={statItems.slice(4)} />
        </div>
      </Section>

      <Section title={t('feeTitle')} intro={t('feeIntro')}>
        <div className="rounded-2xl border border-border/60 bg-card/40 p-6 shadow-sm">
          {/* Stacked bar */}
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/40">
            {FEE_BARS.map((bar) => (
              <div
                key={bar.key}
                className={bar.tone}
                style={{ width: `${bar.pct}%` }}
                aria-label={`${t(`feeBars.${bar.key}`)} ${bar.pct}%`}
              />
            ))}
          </div>

          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {FEE_BARS.map((bar) => (
              <li
                key={bar.key}
                className="flex items-center gap-3 text-sm text-muted-foreground"
              >
                <span
                  className={`inline-block size-3 rounded-sm ${bar.tone}`}
                  aria-hidden
                />
                <span className="font-medium text-foreground">{bar.pct}%</span>
                <span>{t(`feeBars.${bar.key}`)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            {t('feeNote')}
          </p>
        </div>
      </Section>

      <Section title={t('dataTitle')}>
        <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/40 p-6 shadow-sm">
          <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Database className="size-5" />
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t('dataBody')}
          </p>
        </div>
      </Section>

      <Section title={t('verificationsTitle')}>
        <div className="rounded-2xl border border-border/60 bg-card/40 p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">{t('verificationsBody')}</p>
          <div className="mt-3 text-5xl font-bold tracking-tight text-primary animate-count-up">
            {stats.recent_verifications_30d.toLocaleString('en-US')}
          </div>
          <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
            {t('verificationsHint')}
          </div>
        </div>
      </Section>
    </MarketingPage>
  );
}
