import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, Heart, Search, Shield, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import CampaignCard from '@/components/campaign/CampaignCard';
import { BACKEND_URL } from '@/lib/backend-url';
import { CampaignCategory } from '@/lib/types';
import type { CampaignWithStats } from '@/lib/types';

// ============================================================
// Server-side data fetching
// ============================================================

async function getFeaturedCampaigns(): Promise<CampaignWithStats[]> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/campaigns?status=active&limit=4&sort=urgency&order=desc`,
      { next: { revalidate: 300 } }, // cache 5 min
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data ?? [];
  } catch {
    return [];
  }
}

async function getPlatformStats(): Promise<{ totalRaised: number; activeCampaigns: number; donors: number }> {
  try {
    const res = await fetch(`${BACKEND_URL}/campaigns?status=active&limit=1`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return { totalRaised: 0, activeCampaigns: 0, donors: 0 };
    const data = await res.json();
    return {
      totalRaised: 0, // Will be filled from ledger endpoint in a later phase
      activeCampaigns: data.pagination?.total ?? 0,
      donors: 0,
    };
  } catch {
    return { totalRaised: 0, activeCampaigns: 0, donors: 0 };
  }
}

// ============================================================
// Category card data
// ============================================================

const CATEGORIES: Array<{ key: CampaignCategory; icon: string }> = [
  { key: CampaignCategory.MEDICAL, icon: '🏥' },
  { key: CampaignCategory.EDUCATION, icon: '📚' },
  { key: CampaignCategory.EMERGENCY, icon: '🚨' },
  { key: CampaignCategory.COMMUNITY, icon: '🤝' },
  { key: CampaignCategory.CREATIVE, icon: '🎨' },
  { key: CampaignCategory.BUSINESS, icon: '💼' },
  { key: CampaignCategory.OTHER, icon: '✨' },
];

// ============================================================
// Page component (Server Component)
// ============================================================

export default async function HomePage() {
  const t = await getTranslations('landing');
  const tCampaigns = await getTranslations('campaigns');

  const [featuredCampaigns, stats] = await Promise.all([
    getFeaturedCampaigns(),
    getPlatformStats(),
  ]);

  return (
    <div className="flex flex-col">
      {/* ==================== Hero ==================== */}
      <section className="px-4 py-16 text-center sm:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Heart className="size-3 fill-primary" />
            Sahovat
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {t('hero')}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            {t('heroSubtitle')}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" className="gap-2" render={<Link href="/campaigns" />}>
              <Search className="size-4" />
              {t('browseCampaigns')}
            </Button>
            <Button size="lg" variant="outline" className="gap-2" render={<Link href="/create-campaign" />}>
              {t('startCampaign')}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ==================== Stats ==================== */}
      {stats.activeCampaigns > 0 && (
        <section className="border-y border-border bg-muted/30 px-4 py-8">
          <div className="mx-auto grid max-w-3xl grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-foreground sm:text-3xl">
                {stats.activeCampaigns}+
              </p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {t('stats.activeCampaigns')}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground sm:text-3xl">14</p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {/* Regions of Uzbekistan */}
                Regions
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground sm:text-3xl">7</p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {/* Categories */}
                Categories
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ==================== Featured Campaigns ==================== */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                {t('featuredCampaigns')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('featuredSubtitle')}</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 shrink-0" render={<Link href="/campaigns" />}>
              {t('viewAll')} <ArrowRight className="size-3" />
            </Button>
          </div>

          {featuredCampaigns.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {t('noCampaigns')}
            </div>
          )}
        </div>
      </section>

      {/* ==================== Categories ==================== */}
      <section className="border-t border-border bg-muted/20 px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">{t('categories')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('categoriesSubtitle')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {CATEGORIES.map(({ key, icon }) => (
              <Link
                key={key}
                href={`/campaigns?category=${key}`}
                className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-colors hover:border-primary/30 hover:bg-primary/5"
              >
                <span className="text-2xl">{icon}</span>
                <span className="text-xs font-medium text-foreground group-hover:text-primary">
                  {tCampaigns(`categories.${key}`)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== How It Works ==================== */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">{t('howItWorks')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('howItWorksSubtitle')}</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <Search className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t('step1Title')}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t('step1Description')}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <Heart className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t('step2Title')}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t('step2Description')}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <TrendingUp className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t('step3Title')}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t('step3Description')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section className="border-t border-border bg-primary/5 px-4 py-12 text-center">
        <div className="mx-auto max-w-xl">
          <Shield className="mx-auto mb-4 size-10 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">{t('cta')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t('ctaSubtitle')}</p>
          <Button size="lg" className="mt-6 gap-2" render={<Link href="/campaigns" />}>
            {t('getStarted')}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
