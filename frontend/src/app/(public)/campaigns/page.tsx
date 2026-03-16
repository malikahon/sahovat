'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  SlidersHorizontal,
  Stethoscope,
  GraduationCap,
  AlertTriangle,
  Users,
  Palette,
  Briefcase,
  LayoutGrid,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CampaignCard } from '@/components/ui/campaign-card';
import { cn } from '@/lib/utils';

// ============================================================
// MOCK DATA
// ============================================================

const CATEGORIES = [
  { key: 'all', icon: LayoutGrid },
  { key: 'medical', icon: Stethoscope },
  { key: 'education', icon: GraduationCap },
  { key: 'emergency', icon: AlertTriangle },
  { key: 'community', icon: Users },
  { key: 'creative', icon: Palette },
  { key: 'business', icon: Briefcase },
];

const ALL_CAMPAIGNS = [
  {
    id: 'camp-001',
    title: 'Heart Surgery for 5-Year-Old Aziza',
    description: 'Little Aziza from Fergana needs urgent heart surgery. Her family cannot afford the procedure.',
    category: 'medical',
    categoryLabel: 'Medical',
    imageUrl: '',
    raisedAmount: 18500000,
    goalAmount: 25000000,
    daysLeft: 14,
    donorCount: 234,
    isVerified: true,
    creatorName: 'Aziza Karimova Foundation',
  },
  {
    id: 'camp-002',
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
    id: 'camp-003',
    title: 'Flood Relief in Samarkand',
    description: 'Emergency support for families affected by recent flooding in the Samarkand region.',
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
    id: 'camp-004',
    title: 'Community Library in Bukhara',
    description: 'Building a public library with computer lab access for youth in the historic city center.',
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
    id: 'camp-005',
    title: 'Traditional Ikat Workshop Revival',
    description: 'Reviving the ancient art of ikat weaving in Margilan. Supporting artisan families.',
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
    id: 'camp-006',
    title: 'Wheelchair Access for Tashkent Metro',
    description: 'Campaign to fund wheelchair ramps and accessibility improvements at three Metro stations.',
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
    id: 'camp-007',
    title: 'Mobile Clinic for Karakalpakstan',
    description: 'Equipping a mobile medical clinic to serve remote villages with basic healthcare services.',
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
  {
    id: 'camp-008',
    title: 'Tech Bootcamp for Rural Youth',
    description: 'Free coding bootcamp for 50 young people from rural areas of Jizzakh and Syrdarya regions.',
    category: 'education',
    categoryLabel: 'Education',
    imageUrl: '',
    raisedAmount: 6500000,
    goalAmount: 12000000,
    daysLeft: 35,
    donorCount: 145,
    isVerified: true,
    creatorName: 'Digital Uzbekistan',
  },
  {
    id: 'camp-009',
    title: 'Bakery Startup for Disabled Veterans',
    description: 'Helping three disabled veterans launch a community bakery in Andijan to achieve financial independence.',
    category: 'business',
    categoryLabel: 'Business',
    imageUrl: '',
    raisedAmount: 2800000,
    goalAmount: 10000000,
    daysLeft: 40,
    donorCount: 52,
    isVerified: false,
    creatorName: 'Veterans Support Network',
  },
];

const SORT_OPTIONS = ['sortNewest', 'sortMostFunded', 'sortEndingSoon'] as const;

export default function CampaignsPage() {
  const t = useTranslations('campaigns');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSort, setActiveSort] = useState<string>('sortNewest');

  const filtered = ALL_CAMPAIGNS.filter((c) => {
    if (activeCategory !== 'all' && c.category !== activeCategory) return false;
    if (searchQuery && !c.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (activeSort === 'sortMostFunded') return b.raisedAmount - a.raisedAmount;
    if (activeSort === 'sortEndingSoon') return (a.daysLeft ?? 999) - (b.daysLeft ?? 999);
    return 0; // newest = default order
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Discover campaigns that need your help across Uzbekistan
        </p>
      </div>

      {/* Filters bar */}
      <div className="mb-8 space-y-4">
        {/* Search + Sort row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-9"
            />
          </div>
          <div className="flex gap-2">
            {SORT_OPTIONS.map((sort) => (
              <Button
                key={sort}
                variant={activeSort === sort ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveSort(sort)}
                className={cn(
                  activeSort === sort
                    ? 'shadow-warm-xs'
                    : 'text-muted-foreground',
                )}
              >
                {t(sort)}
              </Button>
            ))}
          </div>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.key;
            const label = cat.key === 'all' ? t('all') : t(`categories.${cat.key}`);
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all',
                  isActive
                    ? 'border-sage-400 bg-sage-100 text-sage-700 shadow-warm-xs'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Campaign grid */}
      {sorted.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((campaign) => (
            <CampaignCard key={campaign.id} {...campaign} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sage-100">
            <Heart className="h-6 w-6 text-sage-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {t('noCampaigns')}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {t('noCampaignsDescription')}
          </p>
        </div>
      )}
    </div>
  );
}
