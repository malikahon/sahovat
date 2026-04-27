import * as React from 'react';
import { cn } from '@/lib/utils';

interface MarketingPageProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Outer wrapper for static marketing/info pages. Reuses the same
 * background treatment (subtle grid + radial sage glow) that the
 * landing page uses, so all footer pages feel like one design system.
 *
 * Lives inside `(public)/layout.tsx` which already provides Navbar + Footer.
 */
export function MarketingPage({ children, className }: MarketingPageProps) {
  return (
    <div className={cn('relative isolate overflow-hidden', className)}>
      {/* Background treatment — same vocabulary as landing hero. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-[0.18]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-radial-sage opacity-60"
      />

      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {children}
      </main>
    </div>
  );
}
