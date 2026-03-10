'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { campaignsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

const step2Schema = z.object({
  description: z.string().min(10),
});

type Step2FormData = z.infer<typeof step2Schema>;

export default function Step2Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('id');
  const t = useTranslations('campaigns');

  // Redirect to step 1 if no campaign id
  useEffect(() => {
    if (!campaignId) {
      router.replace('/create-campaign/step-1');
    }
  }, [campaignId, router]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Step2FormData>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      description: '',
    },
  });

  // Load existing campaign
  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const result = await campaignsApi.get(campaignId!);
      if (!result.success) throw new Error(result.error);
      return result.data!.campaign;
    },
    enabled: !!campaignId,
  });

  // Pre-fill description
  useEffect(() => {
    if (campaign && campaign.description.trim()) {
      reset({ description: campaign.description });
    }
  }, [campaign, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: Step2FormData) =>
      campaignsApi.update(campaignId!, { description: data.description }),
    onSuccess: (result) => {
      if (result.success) {
        router.push(`/create-campaign/step-3?id=${campaignId}`);
      }
    },
  });

  if (!campaignId) return null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <form
          onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="description">{t('wizard.description')}</Label>
            <Textarea
              id="description"
              rows={8}
              placeholder={t('wizard.descriptionPlaceholder')}
              {...register('description')}
              aria-invalid={!!errors.description}
            />
            <p className="text-xs text-muted-foreground">
              {t('wizard.descriptionHint')}
            </p>
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          {updateMutation.error && (
            <p className="text-sm text-destructive">
              {updateMutation.error.message}
            </p>
          )}

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push(`/create-campaign/step-1?id=${campaignId}`)
              }
            >
              {t('wizard.step1')}
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {t('wizard.saveDraft')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
