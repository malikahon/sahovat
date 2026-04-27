import * as React from 'react';
import { cn } from '@/lib/utils';

interface ValueCardProps {
  icon?: React.ReactNode;
  /** Optional small label like "Step 1" or a category badge. */
  badge?: string;
  title: React.ReactNode;
  body: React.ReactNode;
  /** Variant tones for emphasis (e.g. red for "prohibited"). */
  tone?: 'default' | 'positive' | 'warning' | 'danger';
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<ValueCardProps['tone']>, string> = {
  default: 'border-border/60',
  positive: 'border-primary/30 bg-primary/[0.04]',
  warning: 'border-amber-500/30 bg-amber-500/[0.04]',
  danger: 'border-red-500/30 bg-red-500/[0.04]',
};

const ICON_CLASSES: Record<NonNullable<ValueCardProps['tone']>, string> = {
  default: 'bg-primary/10 text-primary',
  positive: 'bg-primary/15 text-primary',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  danger: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

export function ValueCard({
  icon,
  badge,
  title,
  body,
  tone = 'default',
  className,
}: ValueCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border bg-card/40 p-6 shadow-sm transition-shadow hover:shadow-md',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {(icon || badge) && (
        <div className="mb-4 flex items-center gap-3">
          {icon && (
            <div
              className={cn(
                'inline-flex size-10 items-center justify-center rounded-xl',
                ICON_CLASSES[tone],
              )}
            >
              {icon}
            </div>
          )}
          {badge && (
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground sm:text-lg">
        {title}
      </h3>
      <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {body}
      </div>
    </div>
  );
}
