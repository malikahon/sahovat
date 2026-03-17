'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [1, 2, 3, 4, 5] as const;
const STEP_KEYS = ['step1', 'step2', 'step3', 'step4', 'step5'] as const;

interface StepIndicatorProps {
  currentStep: number;
  campaignId?: string | null;
}

export function StepIndicator({ currentStep, campaignId }: StepIndicatorProps) {
  const t = useTranslations('campaigns.wizard');

  const getStepHref = (step: number) => {
    if (!campaignId) return `/create-campaign/step-${step}`;
    return `/create-campaign/step-${step}?id=${campaignId}`;
  };

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, index) => {
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;

        return (
          <div key={step} className="flex items-center gap-1">
            <a
              href={getStepHref(step)}
              className={cn(
                'flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity',
              )}
            >
              <div
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors',
                  isCompleted &&
                    'bg-primary text-primary-foreground',
                  isCurrent &&
                    'border-2 border-primary bg-primary/10 text-primary',
                  !isCompleted &&
                    !isCurrent &&
                    'border border-border bg-muted text-muted-foreground',
                )}
              >
                {isCompleted ? (
                  <Check className="size-3.5" />
                ) : (
                  step
                )}
              </div>
              <span
                className={cn(
                  'hidden text-xs font-medium sm:inline',
                  isCurrent ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {t(STEP_KEYS[index])}
              </span>
            </a>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-1 h-px w-6 sm:w-10',
                  step < currentStep ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
