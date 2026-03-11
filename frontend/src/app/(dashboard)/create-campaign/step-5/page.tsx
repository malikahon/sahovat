'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, CheckCircle2, ImageIcon } from 'lucide-react';

import { campaignsApi, withdrawalAccountsApi } from '@/lib/api';
import type { SafeWithdrawalAccount } from '@/lib/types';
import { formatUZS, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Step5Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('id');
  const t = useTranslations('campaigns');

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Redirect to step 1 if no campaign id
  useEffect(() => {
    if (!campaignId) {
      router.replace('/create-campaign/step-1');
    }
  }, [campaignId, router]);

  // Fetch campaign
  const { data: campaign, isLoading: isLoadingCampaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const result = await campaignsApi.get(campaignId!);
      if (!result.success) throw new Error(result.error);
      return result.data!.campaign;
    },
    enabled: !!campaignId,
  });

  // Fetch documents
  const { data: documents = [] } = useQuery({
    queryKey: ['campaign-documents', campaignId],
    queryFn: async () => {
      const result = await campaignsApi.listDocuments(campaignId!);
      if (!result.success) throw new Error(result.error);
      return result.data!.documents;
    },
    enabled: !!campaignId,
  });

  // Fetch withdrawal accounts
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['withdrawal-accounts'],
    queryFn: async () => {
      const result = await withdrawalAccountsApi.list();
      if (!result.success) throw new Error(result.error);
      return result.data!.accounts;
    },
  });

  // Auto-select primary account
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      const primary = accounts.find(
        (a: SafeWithdrawalAccount) => a.is_primary,
      );
      setSelectedAccountId(primary ? primary.id : accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: () => campaignsApi.submit(campaignId!),
    onSuccess: (result) => {
      if (result.success) {
        setSubmitted(true);
      }
    },
  });

  if (!campaignId) return null;

  if (isLoadingCampaign || isLoadingAccounts) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <CheckCircle2 className="size-16 text-green-500" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">
              {t('wizard.submitSuccess')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('wizard.submitSuccessDescription')}
            </p>
          </div>
          <Link href="/my-campaigns">
            <Button>{t('wizard.goToMyCampaigns')}</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (!campaign) return null;

  const descriptionText = campaign.description || '';
  const isLongDescription = descriptionText.length > 300;
  const displayDescription =
    isLongDescription && !descriptionExpanded
      ? descriptionText.slice(0, 300) + '...'
      : descriptionText;

  return (
    <div className="space-y-4">
      {/* Campaign summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t('wizard.review')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {t('wizard.reviewHint')}
          </p>

          {/* Basic info */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                {t('wizard.campaignTitle')}
              </span>
              <span className="text-sm font-medium">{campaign.title}</span>
            </div>
            <Separator />

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                {t('wizard.category')}
              </span>
              <Badge variant="secondary">
                {t(`categories.${campaign.category}`)}
              </Badge>
            </div>
            <Separator />

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                {t('wizard.goalAmount')}
              </span>
              <span className="text-sm font-medium">
                {formatUZS(campaign.goal_amount)}
              </span>
            </div>
            <Separator />

            {campaign.region && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('wizard.region')}
                  </span>
                  <span className="text-sm">
                    {t(`regions.${campaign.region}`)}
                  </span>
                </div>
                <Separator />
              </>
            )}

            {campaign.end_date && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('wizard.endDate')}
                  </span>
                  <span className="text-sm">
                    {formatDate(campaign.end_date)}
                  </span>
                </div>
                <Separator />
              </>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t('wizard.description')}
            </p>
            <p className="whitespace-pre-wrap text-sm">{displayDescription}</p>
            {isLongDescription && (
              <button
                type="button"
                onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                className="text-xs font-medium text-primary hover:underline"
              >
                {descriptionExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>

          <Separator />

          {/* Cover image */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t('wizard.coverImage')}
            </p>
            {campaign.cover_image_url ? (
              <img
                src={campaign.cover_image_url}
                alt="Cover"
                className="h-32 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-20 items-center gap-2 text-muted-foreground/50">
                <ImageIcon className="size-5" />
                <span className="text-xs">{t('wizard.noCoverImage')}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Documents count */}
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              {t('wizard.documents')}
            </span>
            <span className="text-sm">
              {documents.length}{' '}
              {documents.length === 1 ? 'document' : 'documents'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal account */}
      <Card>
        <CardHeader>
          <CardTitle>{t('wizard.withdrawalAccount')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {t('wizard.withdrawalAccountHint')}
          </p>

          {accounts.length === 0 ? (
            <div className="space-y-3 rounded-lg border border-border p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {t('wizard.noWithdrawalAccount')}
              </p>
              <Link href="/withdrawal-accounts">
                <Button variant="outline" size="sm">
                  {t('wizard.addWithdrawalAccount')}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((account: SafeWithdrawalAccount) => (
                <div
                  key={account.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                    selectedAccountId === account.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30',
                  )}
                  onClick={() => setSelectedAccountId(account.id)}
                >
                  <div
                    className={cn(
                      'flex size-4 shrink-0 items-center justify-center rounded-full border',
                      selectedAccountId === account.id
                        ? 'border-primary bg-primary'
                        : 'border-border',
                    )}
                  >
                    {selectedAccountId === account.id && (
                      <div className="size-2 rounded-full bg-primary-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {account.account_holder_name}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {account.provider.toUpperCase()} -{' '}
                      {account.account_number_masked}
                    </p>
                  </div>
                  {account.is_primary && (
                    <Badge variant="secondary">Primary</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {submitMutation.error && (
        <p className="text-sm text-destructive">
          {submitMutation.error.message}
        </p>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            router.push(`/create-campaign/step-4?id=${campaignId}`)
          }
        >
          {t('wizard.step4')}
        </Button>
        <Button
          type="button"
          disabled={
            submitMutation.isPending ||
            accounts.length === 0 ||
            !selectedAccountId
          }
          onClick={() => submitMutation.mutate()}
        >
          {submitMutation.isPending && (
            <Loader2 className="size-4 animate-spin" />
          )}
          {t('wizard.submitForReview')}
        </Button>
      </div>
    </div>
  );
}
