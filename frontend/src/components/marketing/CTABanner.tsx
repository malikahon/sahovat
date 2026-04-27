import * as React from 'react';
import { cn } from '@/lib/utils';

interface CTABannerProps {
  title: React.ReactNode;
  body?: React.ReactNode;
  actions: React.ReactNode;
  className?: string;
}

export function CTABanner({
  title,
  body,
  actions,
  className,
}: CTABannerProps) {
  return (
    <section
      className={cn(
        'mt-16 overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card/40 to-card/40 p-8 text-center shadow-sm sm:p-12',
        className,
      )}
    >
      <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      {body && (
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
          {body}
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {actions}
      </div>
    </section>
  );
}
