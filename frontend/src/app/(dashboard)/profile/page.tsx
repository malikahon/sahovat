'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Loader2, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usersApi } from '@/lib/api';
import { CampaignCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OneIdSection } from './oneid-section';

const CATEGORIES = Object.values(CampaignCategory);

const profileSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(100),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female']).optional().nullable(),
  language_preference: z.enum(['uz', 'ru', 'en']),
  preferred_categories: z
    .array(z.nativeEnum(CampaignCategory))
    .max(7, 'Maximum 7 categories'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const t = useTranslations('profile');
  const tCampaigns = useTranslations('campaigns');
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: '',
      date_of_birth: '',
      gender: null,
      language_preference: 'uz',
      preferred_categories: [],
    },
  });

  // Populate form with user data when available
  useEffect(() => {
    if (user) {
      reset({
        display_name: user.display_name || '',
        date_of_birth: user.date_of_birth || '',
        gender: user.gender || null,
        language_preference: user.language_preference || 'uz',
        preferred_categories: user.preferred_categories || [],
      });
    }
  }, [user, reset]);

  const selectedCategories = watch('preferred_categories');

  const handleCategoryToggle = (category: CampaignCategory) => {
    const current = selectedCategories || [];
    if (current.includes(category)) {
      setValue(
        'preferred_categories',
        current.filter((c) => c !== category),
        { shouldValidate: true },
      );
    } else if (current.length < 7) {
      setValue('preferred_categories', [...current, category], {
        shouldValidate: true,
      });
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setSaveMessage(null);
    try {
      const payload = {
        display_name: data.display_name,
        date_of_birth: data.date_of_birth || undefined,
        gender: data.gender || undefined,
        language_preference: data.language_preference,
        preferred_categories: data.preferred_categories,
      };
      const result = await usersApi.updateProfile(payload);
      if (result.success) {
        setSaveMessage({ type: 'success', text: t('saveSuccess') });
        await refreshUser();
      } else {
        setSaveMessage({
          type: 'error',
          text: result.error || t('saveError'),
        });
      }
    } catch {
      setSaveMessage({ type: 'error', text: t('saveError') });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>

      {/* Profile Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('editProfile')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="display_name">{t('displayName')}</Label>
              <Input
                id="display_name"
                {...register('display_name')}
                aria-invalid={!!errors.display_name}
              />
              {errors.display_name && (
                <p className="text-xs text-destructive">
                  {errors.display_name.message}
                </p>
              )}
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">{t('dateOfBirth')}</Label>
              <Input
                id="date_of_birth"
                type="date"
                {...register('date_of_birth')}
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label>{t('gender')}</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    value="male"
                    {...register('gender')}
                    className="accent-primary"
                  />
                  {t('genderMale')}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    value="female"
                    {...register('gender')}
                    className="accent-primary"
                  />
                  {t('genderFemale')}
                </label>
              </div>
            </div>

            {/* Language Preference */}
            <div className="space-y-2">
              <Label htmlFor="language_preference">{t('language')}</Label>
              <select
                id="language_preference"
                {...register('language_preference')}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="uz">{t('languageUz')}</option>
                <option value="ru">{t('languageRu')}</option>
                <option value="en">{t('languageEn')}</option>
              </select>
            </div>

            {/* Preferred Categories */}
            <div className="space-y-2">
              <Label>{t('categories')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('categoriesHint')}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CATEGORIES.map((category) => {
                  const isChecked = (selectedCategories || []).includes(category);
                  const categoryKey = category as string;
                  return (
                    <label
                      key={category}
                      className="flex items-center gap-2 rounded-lg border border-input p-2 text-sm cursor-pointer hover:bg-muted transition-colors"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleCategoryToggle(category)}
                      />
                      {tCampaigns(`categories.${categoryKey}`)}
                    </label>
                  );
                })}
              </div>
              {errors.preferred_categories && (
                <p className="text-xs text-destructive">
                  {errors.preferred_categories.message}
                </p>
              )}
            </div>

            {/* Save Message */}
            {saveMessage && (
              <div
                className={`rounded-lg border p-3 text-sm ${
                  saveMessage.type === 'success'
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}
              >
                {saveMessage.text}
              </div>
            )}

            {/* Submit */}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {t('save')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* OneID Verification Section */}
      <OneIdSection />
    </div>
  );
}
