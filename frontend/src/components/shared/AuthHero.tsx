'use client';

import { useTranslations } from 'next-intl';
import { ShieldCheck } from 'lucide-react';

export function AuthHero() {
  const t = useTranslations('authHero');

  return (
    <div className="hidden flex-col justify-center lg:flex">
      {/* Trust badge */}
      <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
        <ShieldCheck className="size-3.5" />
        {t('trustBadge')}
      </div>

      {/* Headline */}
      <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground xl:text-5xl">
        {t('headline')}
        <br />
        <span className="text-primary/70">{t('headlineAccent')}</span>
      </h1>

      {/* Description */}
      <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
        {t('description')}
      </p>

      {/* Active users */}
      <div className="mt-8 flex items-center gap-3">
        <div className="flex -space-x-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="size-9 rounded-full border-2 border-background bg-muted"
            />
          ))}
          <div className="flex size-9 items-center justify-center rounded-full border-2 border-background bg-primary/15 text-[10px] font-bold text-primary">
            +2k
          </div>
        </div>
        <span className="text-sm text-muted-foreground">{t('activeUsers')}</span>
      </div>
    </div>
  );
}
