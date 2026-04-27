'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { CampaignCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, UserPlus } from 'lucide-react';

const campaignCategories = Object.values(CampaignCategory);

const registerSchema = z.object({
  display_name: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(100, 'Display name must be at most 100 characters')
    .trim(),
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format')
    .optional()
    .or(z.literal('')),
  gender: z.enum(['male', 'female']).optional(),
  preferred_categories: z
    .array(z.nativeEnum(CampaignCategory))
    .max(7, 'Cannot select more than 7 categories')
    .optional(),
  email: z
    .string()
    .email('emailInvalid')
    .or(z.literal(''))
    .optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const CATEGORY_TRANSLATION_KEY: Record<string, string> = {
  [CampaignCategory.MEDICAL]: 'medical',
  [CampaignCategory.EDUCATION]: 'education',
  [CampaignCategory.EMERGENCY]: 'emergency',
  [CampaignCategory.COMMUNITY]: 'community',
  [CampaignCategory.CREATIVE]: 'creative',
  [CampaignCategory.BUSINESS]: 'business',
  [CampaignCategory.OTHER]: 'other',
};

export default function RegisterPage() {
  const t = useTranslations('auth');
  const tEmail = useTranslations('auth.registerEmail');
  const tCommon = useTranslations('common');
  const tc = useTranslations('campaigns.categories');
  const router = useRouter();
  const { isAuthenticated, isLoading, user, register: authRegister } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const hasRegistrationToken = typeof window !== 'undefined'
    ? !!sessionStorage.getItem('registration_token')
    : false;

  // Redirect to login if not authenticated AND no registration token
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !hasRegistrationToken) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, hasRegistrationToken, router]);

  // Redirect to dashboard if already registered (has display_name)
  useEffect(() => {
    if (!isLoading && user?.display_name) {
      router.replace('/dashboard');
    }
  }, [isLoading, user, router]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      display_name: '',
      date_of_birth: '',
      gender: undefined,
      preferred_categories: [],
      email: '',
    },
  });

  async function onSubmit(data: RegisterFormData) {
    setError(null);
    try {
      await authRegister({
        display_name: data.display_name,
        date_of_birth: data.date_of_birth || undefined,
        gender: data.gender,
        preferred_categories: data.preferred_categories,
        email: data.email && data.email.length > 0 ? data.email : undefined,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated && !hasRegistrationToken) return null;

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <UserPlus className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">{t('registerTitle')}</CardTitle>
        <CardDescription>{t('registerSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="display_name">
              {t('displayName')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="display_name"
              placeholder={t('displayNamePlaceholder')}
              autoFocus
              {...register('display_name')}
            />
            {errors.display_name && (
              <p className="text-sm text-destructive">{errors.display_name.message}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <Label htmlFor="date_of_birth">
              {t('dateOfBirth')}{' '}
              <span className="text-muted-foreground text-xs font-normal">
                ({tCommon('optional')})
              </span>
            </Label>
            <Input
              id="date_of_birth"
              type="date"
              max={new Date().toISOString().split('T')[0]}
              min="1920-01-01"
              {...register('date_of_birth')}
            />
            {errors.date_of_birth && (
              <p className="text-sm text-destructive">{errors.date_of_birth.message}</p>
            )}
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label>
              {t('gender')}{' '}
              <span className="text-muted-foreground text-xs font-normal">
                ({tCommon('optional')})
              </span>
            </Label>
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => field.onChange(field.value === 'male' ? undefined : 'male')}
                    className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      field.value === 'male'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-foreground hover:bg-muted'
                    }`}
                  >
                    {t('genderMale')}
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange(field.value === 'female' ? undefined : 'female')}
                    className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      field.value === 'female'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-foreground hover:bg-muted'
                    }`}
                  >
                    {t('genderFemale')}
                  </button>
                </div>
              )}
            />
          </div>

          {/* Preferred Categories */}
          <div className="space-y-3">
            <div>
              <Label>{t('preferredCategories')}</Label>
              <p className="text-xs text-muted-foreground mt-1">
                {t('preferredCategoriesHint')}
              </p>
            </div>
            <Controller
              name="preferred_categories"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {campaignCategories.map((category) => {
                    const isChecked = field.value?.includes(category) || false;
                    const translationKey = CATEGORY_TRANSLATION_KEY[category];
                    return (
                      <label
                        key={category}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                          isChecked
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const current = field.value || [];
                            if (checked) {
                              if (current.length >= 7) return;
                              field.onChange([...current, category]);
                            } else {
                              field.onChange(current.filter((c) => c !== category));
                            }
                          }}
                        />
                        <span>{tc(translationKey)}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            />
            {errors.preferred_categories && (
              <p className="text-sm text-destructive">{errors.preferred_categories.message}</p>
            )}
          </div>

          {/* Email (optional) */}
          <div className="space-y-2">
            <Label htmlFor="email">{tEmail('label')}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={tEmail('placeholder')}
              {...register('email')}
            />
            <p className="text-xs text-muted-foreground">{tEmail('hint')}</p>
            {errors.email && (
              <p className="text-sm text-destructive">{tEmail('invalid')}</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t('completeRegistration')
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
