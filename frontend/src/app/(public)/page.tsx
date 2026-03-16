import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  ArrowRight,
  Heart,
  Search,
  Shield,
  TrendingUp,
  Sparkles,
  Lock,
  CheckCircle,
  Eye,
  Stethoscope,
  GraduationCap,
  Siren,
  Users,
  Palette,
  Briefcase,
  Star,
  MapPin,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      { next: { revalidate: 300 } },
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
      totalRaised: 0,
      activeCampaigns: data.pagination?.total ?? 0,
      donors: 0,
    };
  } catch {
    return { totalRaised: 0, activeCampaigns: 0, donors: 0 };
  }
}

// ============================================================
// Category config with Lucide icons
// ============================================================

const CATEGORIES: Array<{ key: CampaignCategory; icon: typeof Stethoscope }> = [
  { key: CampaignCategory.MEDICAL, icon: Stethoscope },
  { key: CampaignCategory.EDUCATION, icon: GraduationCap },
  { key: CampaignCategory.EMERGENCY, icon: Siren },
  { key: CampaignCategory.COMMUNITY, icon: Users },
  { key: CampaignCategory.CREATIVE, icon: Palette },
  { key: CampaignCategory.BUSINESS, icon: Briefcase },
  { key: CampaignCategory.OTHER, icon: Star },
];

// ============================================================
// Page component
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
      {/* ==================== HERO ==================== */}
      <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:pb-24 sm:pt-20 lg:pb-32 lg:pt-24">
        {/* Background layers */}
        <div className="pointer-events-none absolute inset-0">
          {/* Animated gradient background */}
          <div className="absolute inset-0 animate-gradient-shift bg-gradient-to-br from-primary/5 via-background to-primary/10" />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-grid opacity-50" />
          {/* Radial glow from top center */}
          <div className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
          {/* Secondary glow */}
          <div className="absolute -bottom-20 right-0 h-[400px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left: Content */}
            <div className="max-w-2xl lg:max-w-none">
              {/* Badge */}
              <div className="animate-fade-in-up mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
                <Sparkles className="size-3.5" />
                {t('heroBadge')}
              </div>

              {/* Headline */}
              <h1 className="animate-fade-in-up stagger-1 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl">
                {t('hero')}
              </h1>

              {/* Subtitle */}
              <p className="animate-fade-in-up stagger-2 mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
                {t('heroSubtitle')}
              </p>

              {/* CTA Buttons */}
              <div className="animate-fade-in-up stagger-3 mt-8 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="gap-2 rounded-full px-8 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30"
                  render={<Link href="/campaigns" />}
                >
                  <Heart className="size-4" />
                  {t('makeDonation')}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 rounded-full border-primary/20 px-8 transition-all duration-300 hover:border-primary/40 hover:bg-primary/5"
                  render={<Link href="/campaigns" />}
                >
                  <Search className="size-4" />
                  {t('browseCampaigns')}
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="animate-fade-in-up stagger-4 mt-10 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Lock className="size-3.5 text-primary" />
                  {t('securePayments')}
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="size-3.5 text-primary" />
                  {t('verifiedCampaigns')}
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="size-3.5 text-primary" />
                  {t('transparentTracking')}
                </span>
              </div>
            </div>

            {/* Right: Floating campaign card preview */}
            <div className="hidden lg:block">
              <div className="relative">
                {/* Decorative glow behind cards */}
                <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-3xl bg-primary/10 blur-2xl" />

                {/* Stacked card preview */}
                <div className="relative space-y-4">
                  {/* Primary floating card */}
                  <div className="animate-float rounded-2xl border border-primary/10 bg-card/80 p-6 shadow-xl shadow-primary/5 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                        <Heart className="size-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t('makeDonation')}</p>
                        <p className="text-xs text-muted-foreground">PayMe / Uzcard / Humo</p>
                      </div>
                    </div>
                    {/* Fake amount pills */}
                    <div className="mt-4 flex gap-2">
                      {['10,000', '50,000', '100,000'].map((amount) => (
                        <div
                          key={amount}
                          className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary"
                        >
                          {amount} UZS
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Secondary floating card */}
                  <div className="animate-float-delayed ml-8 rounded-2xl border border-primary/10 bg-card/80 p-5 shadow-lg shadow-primary/5 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/10">
                        <TrendingUp className="size-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('stats.activeCampaigns')}</p>
                        <p className="text-lg font-bold text-foreground">
                          {stats.activeCampaigns > 0 ? `${stats.activeCampaigns}+` : '--'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Third floating element */}
                  <div className="animate-float -mt-2 ml-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card/80 px-4 py-2 shadow-md backdrop-blur-sm" style={{ animationDelay: '2s' }}>
                    <Shield className="size-4 text-primary" />
                    <span className="text-xs font-medium text-foreground">{t('verifiedCampaigns')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== STATS ==================== */}
      {stats.activeCampaigns > 0 && (
        <section className="relative px-4 py-8">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-2xl border border-primary/10 bg-card/50 p-6 shadow-lg shadow-primary/5 backdrop-blur-sm sm:p-8">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="animate-count-up">
                  <p className="text-2xl font-bold text-primary sm:text-3xl lg:text-4xl">
                    {stats.activeCampaigns}+
                  </p>
                  <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                    <LayoutGrid className="size-3.5" />
                    {t('stats.activeCampaigns')}
                  </p>
                </div>
                <div className="animate-count-up" style={{ animationDelay: '0.2s' }}>
                  <p className="text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">14</p>
                  <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                    <MapPin className="size-3.5" />
                    {t('stats.regions')}
                  </p>
                </div>
                <div className="animate-count-up" style={{ animationDelay: '0.4s' }}>
                  <p className="text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">7</p>
                  <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                    <Star className="size-3.5" />
                    {t('stats.categories')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==================== FEATURED CAMPAIGNS ==================== */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                {t('featuredCampaigns')}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{t('featuredSubtitle')}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="hidden gap-1.5 rounded-full border-primary/20 text-primary hover:border-primary/40 hover:bg-primary/5 sm:inline-flex"
              render={<Link href="/campaigns" />}
            >
              {t('viewAll')} <ArrowRight className="size-3.5" />
            </Button>
          </div>

          {featuredCampaigns.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featuredCampaigns.map((campaign, i) => (
                <div
                  key={campaign.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <CampaignCard campaign={campaign} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-primary/20 bg-card/30 py-16 text-center">
              <Heart className="mx-auto mb-3 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">{t('noCampaigns')}</p>
            </div>
          )}

          {/* Mobile view-all button */}
          <div className="mt-6 text-center sm:hidden">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-full border-primary/20 text-primary"
              render={<Link href="/campaigns" />}
            >
              {t('viewAll')} <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ==================== CATEGORIES ==================== */}
      <section className="relative overflow-hidden px-4 py-16">
        <div className="pointer-events-none absolute inset-0 bg-radial-sage" />
        <div className="relative mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{t('categories')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t('categoriesSubtitle')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {CATEGORIES.map(({ key, icon: Icon }, i) => (
              <Link
                key={key}
                href={`/campaigns?category=${key}`}
                className="group animate-fade-in-up flex flex-col items-center gap-3 rounded-2xl border border-border/50 bg-card/50 p-5 text-center transition-all duration-300 hover:border-primary/30 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/5 sage-glow"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
                  <Icon className="size-5 text-primary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
                  {tCampaigns(`categories.${key}`)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{t('howItWorks')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t('howItWorksSubtitle')}</p>
          </div>

          {/* Desktop: Connected horizontal stepper */}
          <div className="hidden sm:block">
            <div className="relative grid grid-cols-3 gap-8">
              {/* Connecting line */}
              <div className="absolute left-[16.67%] right-[16.67%] top-10 h-px bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

              {[
                { num: t('step1Num'), title: t('step1Title'), desc: t('step1Description'), icon: Search },
                { num: t('step2Num'), title: t('step2Title'), desc: t('step2Description'), icon: Heart },
                { num: t('step3Num'), title: t('step3Title'), desc: t('step3Description'), icon: TrendingUp },
              ].map((step, i) => (
                <div key={i} className="relative flex flex-col items-center text-center">
                  {/* Step number circle */}
                  <div className="relative z-10 flex size-20 items-center justify-center rounded-2xl border border-primary/20 bg-card shadow-lg shadow-primary/5">
                    <step.icon className="size-8 text-primary" />
                  </div>
                  {/* Number badge */}
                  <div className="absolute -right-1 -top-1 z-20 flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-md">
                    {step.num}
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: Vertical timeline */}
          <div className="sm:hidden">
            <div className="relative space-y-8 pl-10">
              {/* Vertical line */}
              <div className="absolute bottom-0 left-[15px] top-0 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-primary/40" />

              {[
                { num: t('step1Num'), title: t('step1Title'), desc: t('step1Description'), icon: Search },
                { num: t('step2Num'), title: t('step2Title'), desc: t('step2Description'), icon: Heart },
                { num: t('step3Num'), title: t('step3Title'), desc: t('step3Description'), icon: TrendingUp },
              ].map((step, i) => (
                <div key={i} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-10 flex size-8 items-center justify-center rounded-full border border-primary/20 bg-card shadow-md">
                    <span className="text-xs font-bold text-primary">{step.num}</span>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-card/50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <step.icon className="size-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section className="relative overflow-hidden px-4 py-20">
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-primary/10" />
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />

        <div className="relative mx-auto max-w-2xl text-center">
          {/* Glowing icon */}
          <div className="relative mx-auto mb-6 inline-flex">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 shadow-lg shadow-primary/10">
              <Shield className="size-8 text-primary" />
            </div>
            <div className="absolute inset-0 animate-sage-pulse rounded-2xl bg-primary/20 blur-xl" />
          </div>

          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">{t('cta')}</h2>
          <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">{t('ctaSubtitle')}</p>

          {/* Social proof */}
          <p className="mt-4 text-xs text-primary/80">{t('ctaSocialProof')}</p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              className="gap-2 rounded-full px-10 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/35"
              render={<Link href="/campaigns" />}
            >
              <Heart className="size-4" />
              {t('getStarted')}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 rounded-full border-primary/20 px-8 transition-all duration-300 hover:border-primary/40 hover:bg-primary/5"
              render={<Link href="/create-campaign" />}
            >
              {t('startCampaign')}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
