'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { withdrawalsApi, withdrawalAccountsApi } from '@/lib/api';
import { formatUZS } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { SafeWithdrawalAccount } from '@/lib/types';

// ============================================================
// FORM SCHEMA
// ============================================================

const withdrawalSchema = z.object({
  withdrawal_account_id: z.string().min(1, 'Select an account'),
  amount: z.number({ invalid_type_error: 'Enter a valid amount' })
    .int('Amount must be a whole number')
    .positive('Amount must be greater than 0'),
});

type WithdrawalFormData = z.infer<typeof withdrawalSchema>;

// ============================================================
// PROVIDER BADGE
// ============================================================

function ProviderBadge({ provider }: { provider: string }) {
  const colorMap: Record<string, string> = {
    payme: 'bg-blue-100 text-blue-700',
    uzcard: 'bg-green-100 text-green-700',
    humo: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium uppercase ${colorMap[provider] ?? 'bg-gray-100 text-gray-600'}`}>
      {provider}
    </span>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function WithdrawPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: campaignId } = use(params);
  const t = useTranslations('withdrawals');
  const router = useRouter();
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);
  const [submittedWithdrawal, setSubmittedWithdrawal] = useState<{
    id: string;
    amount: number;
    net_amount: number;
    platform_fee: number;
    fee_percentage?: number;
  } | null>(null);

  // ---- Fetch campaign balance ----
  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['campaign-balance', campaignId],
    queryFn: async () => {
      const res = await withdrawalsApi.getCampaignBalance(campaignId);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to load balance');
      return res.data;
    },
  });

  // ---- Fetch withdrawal accounts ----
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['withdrawal-accounts'],
    queryFn: async () => {
      const res = await withdrawalAccountsApi.list();
      if (!res.success) throw new Error(res.error ?? 'Failed to load accounts');
      return res.data?.accounts ?? [];
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WithdrawalFormData>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      withdrawal_account_id: '',
      amount: 0,
    },
  });

  const selectedAccountId = watch('withdrawal_account_id');
  const enteredAmount = watch('amount') || 0;
  const availableBalance = balanceData?.available_balance ?? 0;

  // Pre-select primary account
  useEffect(() => {
    if (accountsData && accountsData.length > 0 && !selectedAccountId) {
      const primary = accountsData.find((a) => a.is_primary) ?? accountsData[0];
      setValue('withdrawal_account_id', primary.id);
    }
  }, [accountsData, selectedAccountId, setValue]);

  // Fee preview (estimate based on 1% default — actual calculated server-side)
  const estimatedFee = Math.floor(enteredAmount * 0.01);
  const estimatedNet = enteredAmount - estimatedFee;

  const mutation = useMutation({
    mutationFn: async (data: WithdrawalFormData) => {
      const res = await withdrawalsApi.request({
        campaign_id: campaignId,
        withdrawal_account_id: data.withdrawal_account_id,
        amount: data.amount,
      });
      if (!res.success) throw new Error(res.error ?? 'Failed to submit');
      return res.data!.withdrawal;
    },
    onSuccess: (withdrawal) => {
      setSubmittedWithdrawal(withdrawal);
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['organizer-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-balance', campaignId] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const onSubmit = (data: WithdrawalFormData) => {
    if (data.amount > availableBalance) {
      toast.error(t('errors.insufficientBalance'));
      return;
    }
    mutation.mutate(data);
  };

  const isLoading = balanceLoading || accountsLoading;
  const accounts: SafeWithdrawalAccount[] = accountsData ?? [];

  // ---- Success screen ----
  if (success && submittedWithdrawal) {
    return (
      <div className="max-w-lg mx-auto">
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle2 className="mx-auto size-12 text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">{t('submitSuccess')}</h2>
            <p className="text-sm text-muted-foreground mb-6">{t('submitSuccessDesc')}</p>
            <div className="rounded-lg bg-muted/50 p-4 text-left space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('requestedAmount')}</span>
                <span className="font-medium">{formatUZS(submittedWithdrawal.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('fee', { pct: submittedWithdrawal.fee_percentage ?? '...' })}
                </span>
                <span className="font-medium text-red-600">−{formatUZS(submittedWithdrawal.platform_fee)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t pt-2">
                <span>{t('netAmount')}</span>
                <span className="text-green-600">{formatUZS(submittedWithdrawal.net_amount)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Link href="/withdrawals" className="flex-1">
                <Button variant="outline" className="w-full">{t('history')}</Button>
              </Link>
              <Link href="/dashboard" className="flex-1">
                <Button className="w-full">Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-60" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('requestTitle')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('requestSubtitle')}</p>
      </div>

      {/* Balance info */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('amountHint', { available: '' })}
            </span>
            <span className="font-semibold text-green-600">
              {formatUZS(availableBalance)}
            </span>
          </div>
          {balanceData && balanceData.pending_withdrawals > 0 && (
            <p className="text-xs text-yellow-600 mt-1">
              + {formatUZS(balanceData.pending_withdrawals)} pending
            </p>
          )}
        </CardContent>
      </Card>

      {/* No accounts warning */}
      {accounts.length === 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4 pb-4 flex items-start gap-3">
            <AlertCircle className="size-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">{t('errors.noAccount')}</p>
              <Link href="/withdrawal-accounts">
                <Button size="sm" variant="outline" className="mt-2 text-xs">Add Account</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('requestTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Account selection */}
              <div className="space-y-2">
                <Label>{t('selectAccount')}</Label>
                <div className="space-y-2">
                  {accounts.map((account) => (
                    <label
                      key={account.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        selectedAccountId === account.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <input
                        type="radio"
                        value={account.id}
                        {...register('withdrawal_account_id')}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <ProviderBadge provider={account.provider} />
                          <span className="text-sm font-mono">{account.account_number_masked}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{account.account_holder_name}</p>
                      </div>
                      {account.is_primary && (
                        <span className="text-xs text-primary">Primary</span>
                      )}
                    </label>
                  ))}
                </div>
                {errors.withdrawal_account_id && (
                  <p className="text-xs text-destructive">{errors.withdrawal_account_id.message}</p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="amount">{t('amount')}</Label>
                  <button
                    type="button"
                    onClick={() => setValue('amount', availableBalance, { shouldValidate: true })}
                    className="text-xs text-primary hover:underline"
                  >
                    {t('amountMax')}: {formatUZS(availableBalance)}
                  </button>
                </div>
                <Input
                  id="amount"
                  type="number"
                  min={1}
                  max={availableBalance}
                  placeholder="0"
                  {...register('amount', { valueAsNumber: true })}
                />
                {errors.amount && (
                  <p className="text-xs text-destructive">{errors.amount.message}</p>
                )}
              </div>

              {/* Fee preview */}
              {enteredAmount > 0 && (
                <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('requestedAmount')}</span>
                    <span>{formatUZS(enteredAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('fee', { pct: '~1' })}</span>
                    <span className="text-red-600">−{formatUZS(estimatedFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t pt-1.5">
                    <span>{t('netAmount')}</span>
                    <span className="text-green-600">{formatUZS(estimatedNet)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">* Exact fee calculated at submission</p>
                </div>
              )}

              {enteredAmount > availableBalance && (
                <p className="text-xs text-destructive">{t('errors.insufficientBalance')}</p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending || enteredAmount <= 0 || enteredAmount > availableBalance}
              >
                {mutation.isPending ? t('submitting') : t('submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
