'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  TrendingUp,
  FolderHeart,
  ShieldCheck,
  Wallet,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  UserPlus,
  Heart,
  Stethoscope,
  GraduationCap,
  Users,
  Palette,
  Briefcase,
  Flag,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { ActivityItem, ActivityList } from '@/components/ui/activity-item';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatUZS } from '@/lib/formatters';

// ============================================================
// MOCK DATA
// ============================================================

const MOCK_ACTIVITY = [
  {
    id: 'a1',
    title: 'Campaign "Heart Surgery for Aziza" approved',
    description: 'by Admin Karimov',
    timestamp: '15 minutes ago',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    iconBg: 'bg-sage-100 text-sage-600',
  },
  {
    id: 'a2',
    title: 'New user Dilnoza Rahimova registered',
    description: 'Phone verified via OTP',
    timestamp: '32 minutes ago',
    icon: <UserPlus className="h-3.5 w-3.5" />,
    iconBg: 'bg-sand-100 text-sand-400',
  },
  {
    id: 'a3',
    title: 'Withdrawal #W-042 completed',
    description: '2,500,000 UZS to PayMe ****1234',
    timestamp: '1 hour ago',
    icon: <Wallet className="h-3.5 w-3.5" />,
    iconBg: 'bg-sage-100 text-sage-600',
  },
  {
    id: 'a4',
    title: 'Campaign "Flood Relief" flagged for review',
    description: 'Possible duplicate campaign detected',
    timestamp: '2 hours ago',
    icon: <Flag className="h-3.5 w-3.5" />,
    iconBg: 'bg-terracotta/10 text-terracotta',
  },
  {
    id: 'a5',
    title: 'User Bobur Aliyev verified via OneID',
    description: 'Identity verification approved',
    timestamp: '3 hours ago',
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    iconBg: 'bg-sage-100 text-sage-600',
  },
  {
    id: 'a6',
    title: 'Campaign "Tech Bootcamp" submitted for review',
    description: 'New campaign pending verification',
    timestamp: '4 hours ago',
    icon: <Clock className="h-3.5 w-3.5" />,
    iconBg: 'bg-sand-100 text-sand-400',
  },
  {
    id: 'a7',
    title: 'Withdrawal #W-041 rejected',
    description: 'Cardholder name mismatch',
    timestamp: '5 hours ago',
    icon: <XCircle className="h-3.5 w-3.5" />,
    iconBg: 'bg-terracotta/10 text-terracotta',
  },
  {
    id: 'a8',
    title: 'Donation of 1,000,000 UZS received',
    description: 'Anonymous donor to "School Supplies for Namangan"',
    timestamp: '6 hours ago',
    icon: <Heart className="h-3.5 w-3.5" />,
    iconBg: 'bg-sage-100 text-sage-600',
  },
];

const CATEGORY_DATA = [
  { key: 'Medical', icon: Stethoscope, percent: 35, color: 'bg-sage-500' },
  { key: 'Education', icon: GraduationCap, percent: 25, color: 'bg-sage-400' },
  { key: 'Emergency', icon: AlertTriangle, percent: 20, color: 'bg-terracotta' },
  { key: 'Community', icon: Users, percent: 12, color: 'bg-gold' },
  { key: 'Creative', icon: Palette, percent: 5, color: 'bg-sand-300' },
  { key: 'Business', icon: Briefcase, percent: 3, color: 'bg-sand-200' },
];

const LATEST_CAMPAIGNS = [
  { id: 'lc1', title: 'Heart Surgery for Aziza', amount: 25000000, status: 'active', date: '2 days ago' },
  { id: 'lc2', title: 'School Supplies for Namangan', amount: 8000000, status: 'active', date: '3 days ago' },
  { id: 'lc3', title: 'Flood Relief in Samarkand', amount: 15000000, status: 'active', date: '4 days ago' },
  { id: 'lc4', title: 'Tech Bootcamp for Rural Youth', amount: 12000000, status: 'pending', date: '5 days ago' },
  { id: 'lc5', title: 'Bakery Startup for Veterans', amount: 10000000, status: 'pending', date: '6 days ago' },
];

const LATEST_DONATIONS = [
  { id: 'ld1', donor: 'Aziz K.', campaign: 'Heart Surgery for Aziza', amount: 500000, date: '2h ago' },
  { id: 'ld2', donor: 'Anonymous', campaign: 'School Supplies', amount: 1000000, date: '4h ago' },
  { id: 'ld3', donor: 'Dilnoza R.', campaign: 'Flood Relief', amount: 250000, date: '6h ago' },
  { id: 'ld4', donor: 'Bobur A.', campaign: 'Community Library', amount: 150000, date: '8h ago' },
  { id: 'ld5', donor: 'Anonymous', campaign: 'Ikat Workshop', amount: 300000, date: '12h ago' },
];

const STATUS_BADGE_MAP: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  active: { variant: 'default', label: 'Active' },
  pending: { variant: 'outline', label: 'Pending' },
  completed: { variant: 'secondary', label: 'Completed' },
  rejected: { variant: 'destructive', label: 'Rejected' },
};

export default function AdminPage() {
  const t = useTranslations('admin');

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform overview and management
        </p>
      </div>

      {/* ========== Key Metrics ========== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label={t('totalRaised')}
          value={formatUZS(45000000)}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={{ value: '18%', positive: true }}
          variant="highlight"
        />
        <StatCard
          label={t('activeCampaigns')}
          value="12"
          icon={<FolderHeart className="h-5 w-5" />}
          sublabel="4 pending review"
          variant="default"
        />
        <StatCard
          label={t('pendingVerifications')}
          value="3"
          icon={<ShieldCheck className="h-5 w-5" />}
          variant="urgent"
        />
        <StatCard
          label={t('escrowBalance')}
          value={formatUZS(15000000)}
          icon={<Wallet className="h-5 w-5" />}
          variant="accent"
        />
        <StatCard
          label={t('platformRevenue')}
          value={formatUZS(450000)}
          icon={<DollarSign className="h-5 w-5" />}
          trend={{ value: '8%', positive: true }}
          variant="default"
        />
      </div>

      {/* ========== Pending Actions ========== */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-foreground">
          {t('pendingActions')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-xl border border-terracotta/20 bg-terracotta/5 p-4 shadow-warm-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-terracotta/10 text-terracotta">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-terracotta">3</p>
                <p className="text-xs text-muted-foreground">{t('campaignsAwaitingVerification')}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/campaigns" className="text-terracotta">
                {t('reviewNow')} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-sand-200 bg-sand-50 p-4 shadow-warm-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sand-200 text-sand-400">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">2</p>
                <p className="text-xs text-muted-foreground">{t('withdrawalsPending')}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/withdrawals" className="text-sage-600">
                {t('reviewNow')} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-warm-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sage-100 text-sage-600">
                <Flag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">1</p>
                <p className="text-xs text-muted-foreground">{t('flaggedCampaigns')}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/campaigns" className="text-sage-600">
                {t('reviewNow')} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ========== Activity + Category Breakdown ========== */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Activity (3 col) */}
        <div className="lg:col-span-3">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            {t('recentActivity')}
          </h2>
          <div className="rounded-xl border border-border/50 bg-card shadow-warm-xs">
            <ActivityList>
              {MOCK_ACTIVITY.map((item) => (
                <ActivityItem
                  key={item.id}
                  icon={item.icon}
                  iconBg={item.iconBg}
                  title={item.title}
                  description={item.description}
                  timestamp={item.timestamp}
                />
              ))}
            </ActivityList>
          </div>
        </div>

        {/* Platform Health (2 col) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart placeholder */}
          <div>
            <h2 className="mb-4 text-base font-semibold text-foreground">
              {t('donationsOverTime')}
            </h2>
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-card p-8 shadow-warm-xs">
              <div className="flex h-32 w-full items-end justify-between gap-1.5 px-2">
                {[35, 52, 41, 68, 45, 78, 62, 85, 72, 91, 68, 95].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-sage-300 transition-all hover:bg-sage-500"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                {t('chartPlaceholder')}
              </p>
            </div>
          </div>

          {/* Category Breakdown */}
          <div>
            <h2 className="mb-4 text-base font-semibold text-foreground">
              {t('categoryBreakdown')}
            </h2>
            <div className="rounded-xl border border-border/50 bg-card p-4 shadow-warm-xs">
              <div className="space-y-3">
                {CATEGORY_DATA.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <div key={cat.key} className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-foreground">{cat.key}</span>
                          <span className="text-xs text-muted-foreground">{cat.percent}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${cat.color} transition-all`}
                            style={{ width: `${cat.percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== Data Tables ========== */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Latest Campaigns */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              {t('latestCampaigns')}
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/campaigns" className="text-sage-600 hover:text-sage-700">
                View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="rounded-xl border border-border/50 bg-card shadow-warm-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('campaign')}</TableHead>
                  <TableHead className="text-right">{t('amount')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {LATEST_CAMPAIGNS.map((c) => {
                  const badge = STATUS_BADGE_MAP[c.status] || STATUS_BADGE_MAP.pending;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{c.title}</p>
                          <p className="text-[11px] text-muted-foreground">{c.date}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums font-medium">
                        {formatUZS(c.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant} className="text-[10px]">
                          {badge.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Latest Donations */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              {t('latestDonations')}
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/campaigns" className="text-sage-600 hover:text-sage-700">
                View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="rounded-xl border border-border/50 bg-card shadow-warm-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('donor')}</TableHead>
                  <TableHead>{t('campaign')}</TableHead>
                  <TableHead className="text-right">{t('amount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {LATEST_DONATIONS.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">{d.donor}</p>
                      <p className="text-[11px] text-muted-foreground">{d.date}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground truncate max-w-[150px]">{d.campaign}</p>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums font-medium text-sage-600">
                      {formatUZS(d.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
