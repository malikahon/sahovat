'use client';

import { Suspense, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { StepIndicator } from '@/components/campaign/StepIndicator';
import { SetPasswordForm } from '@/components/auth/SetPasswordForm';

function getStepFromPathname(pathname: string): number {
  const match = pathname.match(/step-(\d)/);
  return match ? parseInt(match[1], 10) : 1;
}

function CreateCampaignContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('campaigns.wizard');
  const { user } = useAuth();
  const currentStep = getStepFromPathname(pathname);
  const campaignId = searchParams.get('id');

  const [passwordJustSet, setPasswordJustSet] = useState(false);

  // Gate: require password before campaign creation
  const needsPassword = user && !user.has_password && !passwordJustSet;

  if (needsPassword) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        </div>
        <SetPasswordForm onPasswordSet={() => setPasswordJustSet(true)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <StepIndicator currentStep={currentStep} campaignId={campaignId} />
      </div>
      {children}
    </div>
  );
}

export default function CreateCampaignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CreateCampaignContent>{children}</CreateCampaignContent>
    </Suspense>
  );
}
