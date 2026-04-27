import * as React from 'react';
import { cn } from '@/lib/utils';

interface SectionProps {
  eyebrow?: string;
  title?: React.ReactNode;
  intro?: React.ReactNode;
  children?: React.ReactNode;
  /** Center-align the section heading block. */
  centered?: boolean;
  className?: string;
}

export function Section({
  eyebrow,
  title,
  intro,
  children,
  centered = false,
  className,
}: SectionProps) {
  return (
    <section className={cn('mb-14 sm:mb-20', className)}>
      {(eyebrow || title || intro) && (
        <header
          className={cn(
            'mb-8',
            centered && 'mx-auto max-w-2xl text-center',
          )}
        >
          {eyebrow && (
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">
              {eyebrow}
            </div>
          )}
          {title && (
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h2>
          )}
          {intro && (
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              {intro}
            </p>
          )}
        </header>
      )}
      {children}
    </section>
  );
}
