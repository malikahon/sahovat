import * as React from 'react';
import { cn } from '@/lib/utils';

export interface Step {
  title: React.ReactNode;
  body: React.ReactNode;
  icon?: React.ReactNode;
}

interface StepFlowProps {
  steps: Step[];
  /** Layout: "grid" wraps in 4-cols on desktop; "vertical" is a list. */
  layout?: 'grid' | 'vertical';
  className?: string;
}

export function StepFlow({
  steps,
  layout = 'grid',
  className,
}: StepFlowProps) {
  if (layout === 'vertical') {
    return (
      <ol className={cn('relative space-y-8 border-l border-border/60 pl-6', className)}>
        {steps.map((step, idx) => (
          <li key={idx} className="relative">
            <span
              className="absolute -left-[34px] top-0 inline-flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm"
              aria-hidden
            >
              {idx + 1}
            </span>
            <h3 className="text-base font-semibold text-foreground sm:text-lg">
              {step.title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ol
      className={cn(
        'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4',
        className,
      )}
    >
      {steps.map((step, idx) => (
        <li
          key={idx}
          className="relative rounded-2xl border border-border/60 bg-card/40 p-6 shadow-sm"
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {idx + 1}
            </span>
            {step.icon && (
              <span className="text-primary" aria-hidden>
                {step.icon}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-foreground">
            {step.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {step.body}
          </p>
        </li>
      ))}
    </ol>
  );
}
