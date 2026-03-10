'use client';

import { usePathname } from 'next/navigation';
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
  const t = useTranslations('campaigns.wizard');
  const currentStep = getStepFromPathname(pathname);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <StepIndicator currentStep={currentStep} />
      </div>
      {children}
    </div>
  );
}
