'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Heart,
  FolderHeart,
  Search,
  PlusCircle,
  Receipt,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  Stethoscope,
  GraduationCap,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { StatCard } from '@/components/ui/stat-card';
import { ActivityItem, ActivityList } from '@/components/ui/activity-item';
import { CampaignCard } from '@/components/ui/campaign-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatUZS } from '@/lib/formatters';

// ============================================================
// MOCK DATA
// ============================================================

const MOCK_RECENT_DONATIONS = [
  {
    id: 'd1',
    campaignTitle: 'Heart Surgery for Aziza',
    amount: 500000,
    date: '2 hours ago',
    status: 'completed' as const,
    category: 'medical',
  },
  {
    id: 'd2',
    campaignTitle: 'School Supplies for Namangan',
    amount: 200000,
    date: '1 day ago',
    status: 'completed' as const,
    category: 'education',
  },
  {
    id: 'd3',
    campaignTitle: 'Flood Relief in Samarkand',
    amount: 1000000,
    date: '3 days ago',
    status: 'completed' as const,
    category: 'emergency',
  },
  {
    id: 'd4',
    campaignTitle: 'Community Library in Bukhara',
    amount: 150000,
    date: '5 days ago',
    status: 'completed' as const,
    category: 'community',
  },
  {
    id: 'd5',
    campaignTitle: 'Mobile Clinic for Karakalpakstan',
    amount: 350000,
    date: '1 week ago',
    status: 'completed' as const,
    category: 'medical',
  },
];

const MOCK_RECOMMENDED = [
  {
    id: 'rec-001',
    title: 'Wheelchair Access for Tashkent Metro',
    description: 'Fund wheelchair ramps and accessibility improvements at three Tashkent Metro stations.',
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
    id: 'rec-002',
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
    id: 'rec-003',
    title: 'Tech Bootcamp for Rural Youth',
    description: 'Free coding bootcamp for 50 young people from rural areas of Jizzakh and Syrdarya.',
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
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  medical: <Stethoscope className="h-3.5 w-3.5" />,
  education: <GraduationCap className="h-3.5 w-3.5" />,
  emergency: <AlertTriangle className="h-3.5 w-3.5" />,
  community: <Users className="h-3.5 w-3.5" />,
};

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { user } = useAuth();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-8">
      {/* ========== Welcome Banner ========== */}
      <div className="relative overflow-hidden rounded-2xl bg-sage-gradient-strong p-6 shadow-warm-sm sm:p-8">
        <div className="absolute inset-0 pattern-ikat opacity-20" />
        <div className="relative">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            {t('welcome')}, {user?.display_name || 'there'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{today}</p>
        </div>
      </div>

      {/* ========== Quick Stats ========== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('totalDonated')}
          value={formatUZS(2450000)}
          icon={<Heart className="h-5 w-5" />}
          trend={{ value: '12%', positive: true }}
          variant="highlight"
        />
        <StatCard
          label={t('campaignsSupported')}
          value="7"
          icon={<FolderHeart className="h-5 w-5" />}
          sublabel="across 4 categories"
          variant="default"
        />
        <StatCard
          label={t('impactScore')}
          value="85"
          icon={<TrendingUp className="h-5 w-5" />}
          trend={{ value: '5 pts', positive: true }}
          variant="accent"
        />
        <StatCard
          label={t('activeRecurring')}
          value="2"
          icon={<RefreshCw className="h-5 w-5" />}
          sublabel="250,000 UZS/month"
          variant="default"
        />
      </div>

      {/* ========== Quick Actions ========== */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-foreground">
          {t('quickActions')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/campaigns"
            className="group flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4 shadow-warm-xs transition-all hover:shadow-warm-md hover:-translate-y-0.5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sage-100 text-sage-600 transition-colors group-hover:bg-sage-200">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t('browseCampaigns')}</p>
              <p className="text-xs text-muted-foreground">{t('browseCampaignsDesc')}</p>
            </div>
          </Link>

          <Link
            href="/my-donations"
            className="group flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4 shadow-warm-xs transition-all hover:shadow-warm-md hover:-translate-y-0.5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sand-100 text-sand-400 transition-colors group-hover:bg-sand-200">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t('myDonationsAction')}</p>
              <p className="text-xs text-muted-foreground">{t('myDonationsDesc')}</p>
            </div>
          </Link>

          <Link
            href="/my-campaigns"
            className="group flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4 shadow-warm-xs transition-all hover:shadow-warm-md hover:-translate-y-0.5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sage-100 text-sage-600 transition-colors group-hover:bg-sage-200">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t('createCampaign')}</p>
              <p className="text-xs text-muted-foreground">{t('createCampaignDesc')}</p>
            </div>
          </Link>
        </div>
      </div>

      {/* ========== Recent Donations + My Campaigns — 2 cols ========== */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Donations (3 col) */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">
              {t('recentDonations')}
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/my-donations" className="text-sage-600 hover:text-sage-700">
                View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="rounded-xl border border-border/50 bg-card shadow-warm-xs">
            <ActivityList>
              {MOCK_RECENT_DONATIONS.map((donation) => (
                <ActivityItem
                  key={donation.id}
                  icon={CATEGORY_ICONS[donation.category] || <Heart className="h-3.5 w-3.5" />}
                  iconBg="bg-sage-100 text-sage-600"
                  title={donation.campaignTitle}
                  description={donation.category.charAt(0).toUpperCase() + donation.category.slice(1)}
                  timestamp={donation.date}
                  amount={`-${formatUZS(donation.amount)}`}
                  amountType="neutral"
                  badge={
                    <Badge variant="secondary" className="text-[10px]">
                      {donation.status}
                    </Badge>
                  }
                />
              ))}
            </ActivityList>
          </div>
        </div>

        {/* My Campaigns Summary (2 col) */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            {t('myCampaignsSummary')}
          </h2>

          {/* Empty state for campaigns */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-card px-6 py-12 text-center shadow-warm-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-100">
              <FolderHeart className="h-5 w-5 text-sage-500" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-foreground">
              {t('noCampaigns')}
            </h3>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              {t('noCampaignsDesc')}
            </p>
            <Button size="sm" className="mt-4 shadow-warm-xs" asChild>
              <Link href="/my-campaigns">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                {t('createCampaign')}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ========== Recommended Campaigns ========== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">
            {t('recommendedCampaigns')}
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/campaigns" className="text-sage-600 hover:text-sage-700">
              View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_RECOMMENDED.map((campaign) => (
            <CampaignCard key={campaign.id} {...campaign} />
          ))}
        </div>
      </div>
    </div>
  );
}
