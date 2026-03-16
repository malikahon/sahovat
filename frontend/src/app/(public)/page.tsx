'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Heart,
  Search,
  HandHeart,
  Eye,
  ArrowRight,
  Stethoscope,
  GraduationCap,
  AlertTriangle,
  Users,
  Palette,
  Briefcase,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CampaignCard } from '@/components/ui/campaign-card';
import { formatUZS } from '@/lib/formatters';

// ============================================================
// MOCK DATA — Replace with real API data when backend is ready
// ============================================================

const MOCK_CATEGORIES = [
  { key: 'medical', icon: Stethoscope, count: 24 },
  { key: 'education', icon: GraduationCap, count: 18 },
  { key: 'emergency', icon: AlertTriangle, count: 12 },
  { key: 'community', icon: Users, count: 31 },
  { key: 'creative', icon: Palette, count: 8 },
  { key: 'business', icon: Briefcase, count: 15 },
];

const FEATURED_CAMPAIGN = {
  id: 'feat-001',
  title: 'Heart Surgery for 5-Year-Old Aziza',
  description:
    'Little Aziza from Fergana needs urgent heart surgery. Her family cannot afford the procedure. Every donation brings her closer to a healthy life. The surgery is scheduled at Tashkent Cardiac Center and the medical team is ready — we just need your help to fund it.',
  category: 'medical',
  categoryLabel: 'Medical',
  imageUrl: '',
  raisedAmount: 18500000,
  goalAmount: 25000000,
  daysLeft: 14,
  donorCount: 234,
  isVerified: true,
  creatorName: 'Aziza Karimova Foundation',
};

const MOCK_CAMPAIGNS = [
  {
    id: 'camp-001',
    title: 'School Supplies for Namangan',
    description: 'Help 200 students in Namangan get school supplies, textbooks, and uniforms for the new academic year.',
    category: 'education',
    categoryLabel: 'Education',
    imageUrl: '',
    raisedAmount: 4200000,
    goalAmount: 8000000,
    daysLeft: 21,
    donorCount: 89,
    isVerified: true,
    creatorName: 'Namangan Education Fund',
  },
  {
    id: 'camp-002',
    title: 'Flood Relief in Samarkand',
    description: 'Emergency support for families affected by recent flooding in the Samarkand region. Funds for shelter, food, and clothing.',
    category: 'emergency',
    categoryLabel: 'Emergency',
    imageUrl: '',
    raisedAmount: 12700000,
    goalAmount: 15000000,
    daysLeft: 7,
    donorCount: 456,
    isVerified: true,
    creatorName: 'Samarkand Relief',
  },
  {
    id: 'camp-003',
    title: 'Community Library in Bukhara',
    description: 'Building a public library with computer lab access for youth in the historic city center of Bukhara.',
    category: 'community',
    categoryLabel: 'Community',
    imageUrl: '',
    raisedAmount: 7800000,
    goalAmount: 20000000,
    daysLeft: 45,
    donorCount: 123,
    isVerified: false,
    creatorName: 'Bukhara Youth Initiative',
  },
  {
    id: 'camp-004',
    title: 'Traditional Ikat Workshop Revival',
    description: 'Reviving the ancient art of ikat weaving in Margilan. Supporting artisan families to preserve cultural heritage.',
    category: 'creative',
    categoryLabel: 'Creative',
    imageUrl: '',
    raisedAmount: 3100000,
    goalAmount: 5000000,
    daysLeft: 30,
    donorCount: 67,
    isVerified: true,
    creatorName: 'Margilan Artisans Guild',
  },
  {
    id: 'camp-005',
    title: 'Wheelchair Access for Tashkent Metro',
    description: 'Campaign to fund wheelchair ramps and accessibility improvements at three Tashkent Metro stations.',
    category: 'community',
    categoryLabel: 'Community',
    imageUrl: '',
    raisedAmount: 9200000,
    goalAmount: 30000000,
    daysLeft: 60,
    donorCount: 312,
    isVerified: true,
    creatorName: 'Access For All Uzbekistan',
  },
  {
    id: 'camp-006',
    title: 'Mobile Clinic for Karakalpakstan',
    description: 'Equipping a mobile medical clinic to serve remote villages in Karakalpakstan region with basic healthcare.',
    category: 'medical',
    categoryLabel: 'Medical',
    imageUrl: '',
    raisedAmount: 22000000,
    goalAmount: 35000000,
    daysLeft: 18,
    donorCount: 578,
    isVerified: true,
    creatorName: 'Rural Health Initiative',
  },
];

const IMPACT_STATS = [
  { value: '45,000,000+', labelKey: 'impactRaised', suffix: ' UZS' },
  { value: '120+', labelKey: 'impactCampaigns', suffix: '' },
  { value: '2,400+', labelKey: 'impactLives', suffix: '' },
];

// ============================================================
// COMPONENT
// ============================================================

export default function HomePage() {
  const t = useTranslations('landing');
  const tc = useTranslations('campaigns.categories');
  const tCamp = useTranslations('campaigns');

  return (
    <div className="flex flex-col">
      {/* ========== HERO SECTION ========== */}
      <section className="relative overflow-hidden bg-sage-hero">
        {/* Subtle pattern */}
        <div className="absolute inset-0 pattern-ikat opacity-30" />

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 lg:pb-28 lg:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {t('hero')}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('subtitle')}
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
              <Button size="lg" className="shadow-warm-md" asChild>
                <Link href="/campaigns">
                  <Search className="mr-2 h-4 w-4" />
                  {t('browseCampaigns')}
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="shadow-warm-xs" asChild>
                <Link href="/login">
                  {t('startCampaign')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Stats strip */}
            <div className="mx-auto mt-12 grid max-w-lg grid-cols-3 gap-6 sm:mt-16">
              <div className="text-center">
                <p className="text-2xl font-bold text-sage-700 sm:text-3xl">45M+</p>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{t('statsRaised')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-sage-700 sm:text-3xl">120+</p>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{t('statsCampaigns')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-sage-700 sm:text-3xl">2.4K+</p>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{t('statsDonors')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FEATURED CAMPAIGN ========== */}
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-6 flex items-center gap-2">
          <Star className="h-5 w-5 text-gold" fill="currentColor" />
          <h2 className="text-lg font-bold text-foreground sm:text-xl">
            {t('featuredTitle')}
          </h2>
        </div>
        <CampaignCard {...FEATURED_CAMPAIGN} variant="featured" />
      </section>

      {/* ========== CATEGORY TABS ========== */}
      <section className="border-y border-border bg-sage-gradient">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <h2 className="mb-8 text-center text-lg font-bold text-foreground sm:text-xl">
            {t('categoriesTitle')}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {MOCK_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.key}
                  href={`/campaigns?category=${cat.key}`}
                  className="group flex flex-col items-center gap-2.5 rounded-xl border border-border/50 bg-card p-4 shadow-warm-xs transition-all hover:shadow-warm-md hover:-translate-y-0.5 sm:p-5"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sage-100 text-sage-600 transition-colors group-hover:bg-sage-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">
                      {tc(cat.key)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {cat.count} {tCamp('title').toLowerCase()}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== TRENDING CAMPAIGNS GRID ========== */}
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground sm:text-xl">
            {t('trendingTitle')}
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/campaigns" className="text-sage-600 hover:text-sage-700">
              View All
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_CAMPAIGNS.map((campaign) => (
            <CampaignCard key={campaign.id} {...campaign} />
          ))}
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section className="border-y border-border bg-sage-gradient-strong">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
          <h2 className="mb-12 text-center text-lg font-bold text-foreground sm:text-xl lg:text-2xl">
            {t('howItWorksTitle')}
          </h2>
          <div className="grid gap-8 sm:grid-cols-3 sm:gap-6 lg:gap-10">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-200 text-sage-700 shadow-warm-xs">
                <Search className="h-6 w-6" />
              </div>
              <div className="mt-2 flex h-7 w-7 items-center justify-center rounded-full bg-sage-600 text-xs font-bold text-white">
                1
              </div>
              <h3 className="mt-3 text-base font-semibold text-foreground">
                {t('howItWorksStep1Title')}
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {t('howItWorksStep1Desc')}
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sand-200 text-sand-400 shadow-warm-xs">
                <HandHeart className="h-6 w-6" />
              </div>
              <div className="mt-2 flex h-7 w-7 items-center justify-center rounded-full bg-sage-600 text-xs font-bold text-white">
                2
              </div>
              <h3 className="mt-3 text-base font-semibold text-foreground">
                {t('howItWorksStep2Title')}
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {t('howItWorksStep2Desc')}
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-200 text-sage-700 shadow-warm-xs">
                <Eye className="h-6 w-6" />
              </div>
              <div className="mt-2 flex h-7 w-7 items-center justify-center rounded-full bg-sage-600 text-xs font-bold text-white">
                3
              </div>
              <h3 className="mt-3 text-base font-semibold text-foreground">
                {t('howItWorksStep3Title')}
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {t('howItWorksStep3Desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== IMPACT / SOCIAL PROOF ========== */}
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <h2 className="mb-10 text-center text-lg font-bold text-foreground sm:text-xl lg:text-2xl">
          {t('impactTitle')}
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {IMPACT_STATS.map((stat) => (
            <div
              key={stat.labelKey}
              className="rounded-xl border border-border bg-card p-6 text-center shadow-warm-xs sm:p-8"
            >
              <p className="text-2xl font-bold text-sage-700 sm:text-3xl lg:text-4xl">
                {stat.value}
              </p>
              <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
                {t(stat.labelKey)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== CTA BANNER ========== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-sage-800" />
        <div className="absolute inset-0 pattern-ikat opacity-10" />

        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-sage-50 sm:text-3xl">
              {t('ctaTitle')}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-sage-300">
              {t('ctaSubtitle')}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
              <Button
                size="lg"
                className="bg-white text-sage-800 shadow-warm-md hover:bg-sage-50"
                asChild
              >
                <Link href="/campaigns">
                  <Heart className="mr-2 h-4 w-4" />
                  {t('ctaStartDonating')}
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-sage-500 text-sage-100 hover:bg-sage-700 hover:text-sage-50"
                asChild
              >
                <Link href="/login">
                  {t('ctaCreateCampaign')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
