'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Edit, 
  Users, 
  TrendingUp, 
  Clock,
  CreditCard,
  FileText,
  Heart
} from 'lucide-react';
import { campaignsApi, donationsApi, withdrawalsApi } from '@/lib/api';
import { formatUZS, formatDate } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function CampaignManagePage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('campaigns');
  const campaignId = params.id as string;

  const { data: campaign, isLoading: loadingCampaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const result = await campaignsApi.get(campaignId);
      if (!result.success) throw new Error(result.error);
      return result.data!.campaign;
    },
  });

  const { data: donationsData, isLoading: loadingDonations } = useQuery({
    queryKey: ['campaign-donations', campaignId],
    queryFn: async () => {
      const result = await donationsApi.listByCampaign(campaignId, { limit: 50 });
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
  });

  const { data: withdrawalsData, isLoading: loadingWithdrawals } = useQuery({
    queryKey: ['campaign-withdrawals', campaignId],
    queryFn: async () => {
      const result = await withdrawalsApi.listMy({ campaign_id: campaignId, limit: 50 });
      if (!result.success) throw new Error(result.error);
      return result;
    },
  });

  if (loadingCampaign) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Skeleton className="mb-6 h-8 w-40" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Campaign not found</p>
        <Button variant="link" onClick={() => router.push('/my-campaigns')}>
          Back to My Campaigns
        </Button>
      </div>
    );
  }

  const donations = donationsData || [];
  const withdrawals = withdrawalsData?.withdrawals || [];
  const totalRaised = campaign.current_amount || 0;
  const goalAmount = campaign.goal_amount || 1;
  const progress = Math.min((totalRaised / goalAmount) * 100, 100);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/my-campaigns')}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{campaign.title}</h1>
            <p className="text-sm text-muted-foreground">
              Created {formatDate(campaign.created_at)}
            </p>
          </div>
        </div>
        <Button render={<Link href={`/create-campaign?edit=${campaignId}`}>
          <Edit className="mr-2 size-4" />
          Edit Campaign
        </Link>} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Funding Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-5 text-primary" />
                Funding Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    {formatUZS(totalRaised)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    raised of {formatUZS(goalAmount)} goal
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{progress.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">funded</p>
                </div>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div 
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users className="size-4" />
                  {donations.length} donations
                </span>
                {campaign.end_date && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="size-4" />
                    Ends {formatDate(campaign.end_date)}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Donations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="size-5 text-primary" />
                Recent Donations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDonations ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : donations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No donations yet
                </p>
              ) : (
                <div className="space-y-3">
                  {donations.slice(0, 10).map((donation: any) => (
                    <div key={donation.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {donation.is_anonymous ? 'Anonymous' : donation.donor_display_name || 'Anonymous'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(donation.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatUZS(donation.amount)}</p>
                        <Badge variant="secondary" className="text-xs">
                          {donation.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {donations.length > 10 && (
                    <p className="text-center text-sm text-muted-foreground">
                      +{donations.length - 10} more donations
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Campaign Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                Campaign Story
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {campaign.description || 'No description provided.'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Raised</span>
                <span className="font-semibold">{formatUZS(totalRaised)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Donations</span>
                <span className="font-semibold">{donations.length}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Donation</span>
                <span className="font-semibold">
                  {donations.length > 0 
                    ? formatUZS(Math.round(totalRaised / donations.length))
                    : formatUZS(0)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Goal</span>
                <span className="font-semibold">{formatUZS(goalAmount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Withdrawals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-5 text-primary" />
                Withdrawals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingWithdrawals ? (
                <Skeleton className="h-20 w-full" />
              ) : withdrawals.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    No withdrawals yet
                  </p>
                  {totalRaised > 0 && (
                    <Button size="sm" render={<Link href={`/campaigns/${campaignId}/withdraw`}>
                      Request Withdrawal
                    </Link>} />
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {withdrawals.map((withdrawal: any) => (
                    <div key={withdrawal.id} className="rounded-lg border p-3">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">{formatUZS(withdrawal.amount)}</span>
                        <Badge 
                          variant={
                            withdrawal.status === 'completed' ? 'default' :
                            withdrawal.status === 'approved' ? 'secondary' :
                            withdrawal.status === 'rejected' ? 'destructive' : 'outline'
                          }
                        >
                          {withdrawal.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(withdrawal.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline" render={<Link href={`/campaigns/${campaignId}`}>
                View Public Page
              </Link>} />
              {totalRaised > 0 && (
                <Button className="w-full" render={<Link href={`/campaigns/${campaignId}/withdraw`}>
                  Request Withdrawal
                </Link>} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
