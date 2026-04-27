import * as React from 'react';
import { cn } from '@/lib/utils';

export interface StatItem {
  label: string;
  value: string;
  /** Optional small caption under the value (e.g. "verified"). */
  hint?: string;
}

interface StatStripProps {
  stats: StatItem[];
  className?: string;
}

/**
 * Horizontal strip of summary stats. Server-component-safe.
 * Numbers reveal via the existing `animate-count-up` keyframe in
 * `globals.css` (no JS counter library).
 */
export function StatStrip({ stats, className }: StatStripProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-4 rounded-2xl border border-border/60 bg-card/40 p-6 shadow-sm backdrop-blur-sm sm:grid-cols-4 sm:gap-6',
        className,
      )}
    >
      {stats.map((stat, idx) => (
        <div
          key={`${stat.label}-${idx}`}
          className="flex flex-col items-start"
        >
          <div className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl animate-count-up">
            {stat.value}
          </div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {stat.label}
          </div>
          {stat.hint && (
            <div className="mt-0.5 text-xs text-muted-foreground/80">
              {stat.hint}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
