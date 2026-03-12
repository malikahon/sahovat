'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCard, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const settingsSchema = z.object({
  master_card_number: z
    .string()
    .refine((v) => v === '' || /^\d{16}$/.test(v), 'Card number must be exactly 16 digits')
    .optional(),
  master_card_holder_name: z.string().optional(),
  platform_fee_percentage: z
    .number({ invalid_type_error: 'Must be a number' })
    .min(1, 'Must be at least 1%')
    .max(3, 'Must be at most 3%')
    .multipleOf(0.5, 'Must be in 0.5 increments')
    .optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function AdminSettingsPage() {
  const t = useTranslations('admin.settings');
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<SettingsFormData | null>(null);
  const [loading, setLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminApi.getSettings(),
  });

  const settings = data?.data;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      master_card_number: '',
      master_card_holder_name: settings?.master_card_holder_name ?? '',
      platform_fee_percentage: settings?.platform_fee_percentage ?? 1,
    },
  });

  function onSubmit(data: SettingsFormData) {
    // Strip empty card number (means "don't change it")
    const payload: SettingsFormData = {
      ...data,
      master_card_number: data.master_card_number?.trim() || undefined,
    };
    setPendingData(payload);
    setShowConfirm(true);
  }

  async function handleConfirm() {
    if (!pendingData) return;
    setLoading(true);
    try {
      const result = await adminApi.updateSettings({
        master_card_number: pendingData.master_card_number,
        master_card_holder_name: pendingData.master_card_holder_name,
        platform_fee_percentage: pendingData.platform_fee_percentage,
      });

      if (result.success) {
        toast.success(t('updateSuccess'));
        queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      } else {
        toast.error(result.error ?? 'Update failed');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
      setShowConfirm(false);
      setPendingData(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full max-w-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
      </div>

      <div className="max-w-lg space-y-6">
        {/* Current settings display */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="size-4" />
              {t('masterCard')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('cardNumberMasked')}</span>
              <span className="font-mono font-medium">
                {settings?.master_card_number_masked ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('cardHolder')}</span>
              <span>{settings?.master_card_holder_name || '—'}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Percent className="size-3" />
                {t('platformFee')}
              </span>
              <span className="font-medium">{settings?.platform_fee_percentage ?? 1}%</span>
            </div>
            {settings?.updated_at && (
              <p className="text-xs text-muted-foreground">
                {t('lastUpdated')} {new Date(settings.updated_at).toLocaleString()}
                {settings.updated_by_name && ` ${t('by')} ${settings.updated_by_name}`}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Update form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('updateSettings')}</CardTitle>
            <CardDescription>
              Leave card number blank to keep the current card.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="card-number">{t('newCardNumber')}</Label>
                <Input
                  id="card-number"
                  type="text"
                  inputMode="numeric"
                  placeholder="1234567890123456"
                  maxLength={16}
                  {...register('master_card_number')}
                />
                {errors.master_card_number && (
                  <p className="text-xs text-destructive">{errors.master_card_number.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="card-holder">{t('cardHolder')}</Label>
                <Input
                  id="card-holder"
                  type="text"
                  placeholder="JOHN DOE"
                  {...register('master_card_holder_name')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fee-pct">
                  {t('platformFee')}
                  <span className="ml-1 text-xs text-muted-foreground">({t('feeRange')})</span>
                </Label>
                <Input
                  id="fee-pct"
                  type="number"
                  step="0.5"
                  min="1"
                  max="3"
                  {...register('platform_fee_percentage', { valueAsNumber: true })}
                />
                {errors.platform_fee_percentage && (
                  <p className="text-xs text-destructive">
                    {errors.platform_fee_percentage.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{t('feeDescription')}</p>
              </div>

              <Button type="submit" disabled={!isDirty} className="w-full">
                {t('updateSettings')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Confirm dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('updateConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingData?.master_card_number && (
                <span>Card number will be updated. </span>
              )}
              {pendingData?.platform_fee_percentage !== undefined && (
                <span>Platform fee will be set to {pendingData.platform_fee_percentage}%.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={loading}>
              {loading ? 'Saving...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
