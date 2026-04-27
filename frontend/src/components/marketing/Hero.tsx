import * as React from 'react';
import { cn } from '@/lib/utils';

interface HeroProps {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}

/**
 * Page-top hero. Uses the same animated reveal classes the landing
 * page uses (`animate-fade-in-up`, `stagger-*`) so visitors get a
 * consistent feel across the site.
 */
export function Hero({
  eyebrow,
  title,
  subtitle,
  actions,
  align = 'left',
  className,
}: HeroProps) {
  const isCenter = align === 'center';
  return (
    <section
      className={cn(
        'mb-12 sm:mb-16',
        isCenter ? 'text-center' : 'text-left',
        className,
      )}
    >
      {eyebrow && (
        <div
          className={cn(
            'mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary animate-fade-in-up',
          )}
        >
          {eyebrow}
        </div>
      )}
      <h1
        className={cn(
          'text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl animate-fade-in-up stagger-1',
          isCenter && 'mx-auto max-w-3xl',
        )}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className={cn(
            'mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg animate-fade-in-up stagger-2',
            isCenter && 'mx-auto',
          )}
        >
          {subtitle}
        </p>
      )}
      {actions && (
        <div
          className={cn(
            'mt-8 flex flex-wrap items-center gap-3 animate-fade-in-up stagger-3',
            isCenter && 'justify-center',
          )}
        >
          {actions}
        </div>
      )}
    </section>
  );
}
