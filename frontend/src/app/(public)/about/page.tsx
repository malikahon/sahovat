import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, ShieldCheck, Eye, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  MarketingPage,
  Hero,
  Section,
  StatStrip,
  ValueCard,
  CTABanner,
  type StatItem,
} from '@/components/marketing';
import { fetchPublicStats } from '@/lib/public-stats';
import { formatUZS } from '@/lib/formatters';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.about');
  return { title: t('title'), description: t('description') };
}

export default async function AboutPage() {
  const t = await getTranslations('pages.about');
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
      label: tMk('stats.totalRaised'),
      value: formatUZS(Math.round(stats.total_donated_amount)),
    },
    {
      label: tMk('stats.verifiedOrganizers'),
      value: stats.verified_organizers.toLocaleString('en-US'),
    },
  ];

  return (
    <MarketingPage>
      <Hero
        eyebrow={t('eyebrow')}
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <>
            <Button size="lg" render={<Link href="/campaigns" />}>
              {t('ctaPrimary')}
              <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/create-campaign/step-1" />}>
              {t('ctaSecondary')}
            </Button>
          </>
        }
      />

      <Section title={t('missionTitle')}>
        <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t('missionBody')}
        </p>
      </Section>

      <Section title={t('storyTitle')}>
        <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t('storyBody')}
        </p>
      </Section>

      <Section title={t('valuesTitle')} intro={t('valuesIntro')}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <ValueCard
            icon={<Eye className="size-5" />}
            title={t('values.transparency.title')}
            body={t('values.transparency.body')}
          />
          <ValueCard
            icon={<ShieldCheck className="size-5" />}
            title={t('values.verification.title')}
            body={t('values.verification.body')}
          />
          <ValueCard
            icon={<MapPin className="size-5" />}
            title={t('values.localFirst.title')}
            body={t('values.localFirst.body')}
          />
        </div>
      </Section>

      <Section title={t('statsTitle')} intro={t('statsIntro')}>
        <StatStrip stats={statItems} />
      </Section>

      <CTABanner
        title={t('ctaTitle')}
        body={t('ctaBody')}
        actions={
          <>
            <Button size="lg" render={<Link href="/campaigns" />}>
              {t('ctaPrimary')}
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/create-campaign/step-1" />}>
              {t('ctaSecondary')}
            </Button>
          </>
        }
      />
    </MarketingPage>
  );
}
