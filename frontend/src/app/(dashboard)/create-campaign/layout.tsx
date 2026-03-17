'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { StepIndicator } from '@/components/campaign/StepIndicator';

function getStepFromPathname(pathname: string): number {
  const match = pathname.match(/step-(\d)/);
  return match ? parseInt(match[1], 10) : 1;
}

export default function CreateCampaignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('campaigns.wizard');
  const currentStep = getStepFromPathname(pathname);
  const campaignId = searchParams.get('id');

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
