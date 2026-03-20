'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { campaignsApi } from '@/lib/api';
import { CampaignCategory, UzbekRegion } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

const step1Schema = z.object({
  title: z.string().min(3).max(200),
  category: z.nativeEnum(CampaignCategory),
  goal_amount: z.coerce.number().int().positive(),
  region: z.union([z.nativeEnum(UzbekRegion), z.literal('')]).optional(),
  end_date: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        return new Date(val) > new Date();
      },
      { message: 'End date must be in the future' },
    ),
});

type Step1FormData = z.infer<typeof step1Schema>;

export default function Step1Page() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>}>
      <Step1Content />
    </Suspense>
  );
}

function Step1Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('id');
  const t = useTranslations('campaigns');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      title: '',
      category: undefined,
      goal_amount: undefined,
      region: '',
      end_date: '',
    },
  });

  // Load existing draft if editing
  const { data: campaign, isLoading: isLoadingCampaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const result = await campaignsApi.get(campaignId!);
      if (!result.success) throw new Error(result.error);
      return result.data!.campaign;
    },
    enabled: !!campaignId,
  });

  // Pre-fill form when campaign loads
  useEffect(() => {
    if (campaign) {
      reset({
        title: campaign.title,
        category: campaign.category,
        goal_amount: campaign.goal_amount,
        region: campaign.region || '',
        end_date: campaign.end_date ? campaign.end_date.split('T')[0] : '',
      });
    }
  }, [campaign, reset]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Step1FormData) => {
      const region = data.region || undefined;
      const result = await campaignsApi.create({
        title: data.title,
        description: 'To be added in the next step.',
        category: data.category,
        goal_amount: data.goal_amount,
        region: region as UzbekRegion | undefined,
        end_date: data.end_date || undefined,
      });
      if (!result.success) {
        throw new Error(result.error || 'Failed to create campaign');
      }
      return result;
    },
    onSuccess: (result) => {
      if (result.data) {
        router.push(`/create-campaign/step-2?id=${result.data.campaign.id}`);
      }
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Step1FormData) => {
      const region = data.region || undefined;
      const result = await campaignsApi.update(campaignId!, {
        title: data.title,
        category: data.category,
        goal_amount: data.goal_amount,
        region: region as UzbekRegion | undefined,
        end_date: data.end_date || undefined,
      });
      if (!result.success) {
        throw new Error(result.error || 'Failed to update campaign');
      }
      return result;
    },
    onSuccess: () => {
      router.push(`/create-campaign/step-2?id=${campaignId}`);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  const onSubmit = (data: Step1FormData) => {
    if (campaignId) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (campaignId && isLoadingCampaign) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('wizard.campaignTitle')}</Label>
            <Input
              id="title"
              placeholder={t('wizard.campaignTitlePlaceholder')}
              {...register('title')}
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">{t('wizard.category')}</Label>
            <select
              id="category"
              {...register('category')}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-invalid={!!errors.category}
            >
              <option value="">{t('wizard.categoryPlaceholder')}</option>
              {Object.values(CampaignCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {t(`categories.${cat}`)}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-xs text-destructive">{errors.category.message}</p>
            )}
          </div>

          {/* Goal Amount */}
          <div className="space-y-2">
            <Label htmlFor="goal_amount">{t('wizard.goalAmount')}</Label>
            <Input
              id="goal_amount"
              type="number"
              min={1}
              placeholder={t('wizard.goalAmountPlaceholder')}
              {...register('goal_amount')}
              aria-invalid={!!errors.goal_amount}
            />
            {errors.goal_amount && (
              <p className="text-xs text-destructive">{errors.goal_amount.message}</p>
            )}
          </div>

          {/* Region */}
          <div className="space-y-2">
            <Label htmlFor="region">{t('wizard.region')}</Label>
            <select
              id="region"
              {...register('region')}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">{t('wizard.regionPlaceholder')}</option>
              {Object.values(UzbekRegion).map((region) => (
                <option key={region} value={region}>
                  {t(`regions.${region}`)}
                </option>
              ))}
            </select>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="end_date">{t('wizard.endDate')}</Label>
            <Input
              id="end_date"
              type="date"
              {...register('end_date')}
              aria-invalid={!!errors.end_date}
            />
            <p className="text-xs text-muted-foreground">{t('wizard.endDateHint')}</p>
            {errors.end_date && (
              <p className="text-xs text-destructive">{errors.end_date.message}</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error.message}</p>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {campaignId && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/create-campaign/step-2?id=${campaignId}`)}
                  >
                    {t('wizard.step2')} →
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/create-campaign/step-3?id=${campaignId}`)}
                  >
                    {t('wizard.step3')} →
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/create-campaign/step-4?id=${campaignId}`)}
                  >
                    {t('wizard.step4')} →
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/create-campaign/step-5?id=${campaignId}`)}
                  >
                    {t('wizard.step5')} →
                  </Button>
                </>
              )}
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {campaignId ? 'Update & Continue' : t('wizard.saveDraft')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
