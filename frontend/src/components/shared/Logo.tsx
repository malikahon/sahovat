'use client';

import Link from 'next/link';
import { HeartHandshake } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional subtitle (e.g. "Admin") shown below the brand name */
  subtitle?: string;
  /** Whether the logo links somewhere. Defaults to "/" */
  href?: string;
  /** If true, renders without a link wrapper */
  asStatic?: boolean;
  /** Additional className */
  className?: string;
}

const sizeConfig = {
  sm: { icon: 'size-5', text: 'text-sm', gap: 'gap-2' },
  md: { icon: 'size-7', text: 'text-lg', gap: 'gap-2.5' },
  lg: { icon: 'size-8', text: 'text-xl', gap: 'gap-3' },
} as const;

export function Logo({
  size = 'md',
  subtitle,
  href = '/',
  asStatic = false,
  className,
}: LogoProps) {
  const config = sizeConfig[size];

  const content = (
    <>
      <div className="relative">
        <HeartHandshake
          className={cn(config.icon, 'text-primary transition-transform duration-300 group-hover:scale-110')}
        />
        <div className="absolute inset-0 animate-sage-pulse rounded-full bg-primary/20 blur-md" />
      </div>
      <div className="flex flex-col">
        <span
          className={cn(
            config.text,
            'font-bold tracking-tight text-foreground',
          )}
        >
          SAHOVAT
        </span>
        {subtitle && (
          <span className="text-[10px] leading-none text-muted-foreground">
            {subtitle}
          </span>
        )}
      </div>
    </>
  );

  if (asStatic) {
    return (
      <div className={cn('flex items-center', config.gap, className)}>
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn('group flex items-center', config.gap, className)}
    >
      {content}
    </Link>
  );
}
