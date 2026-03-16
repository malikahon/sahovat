'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

const LOCALES = ['uz', 'en', 'ru'] as const;
type Locale = (typeof LOCALES)[number];

const LOCALE_LABELS: Record<Locale, string> = {
  uz: 'UZ',
  en: 'EN',
  ru: 'RU',
};

export function LanguageSwitcher() {
  const router = useRouter();
  const currentLocale = useLocale() as Locale;

  function switchLocale(locale: Locale) {
    if (locale === currentLocale) return;
    document.cookie = `locale=${locale};path=/;max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }

  return (
    <div className="inline-flex items-center rounded-full border border-border bg-card/50 px-1 py-0.5 text-sm">
      {LOCALES.map((locale, index) => (
        <span key={locale} className="inline-flex items-center">
          <button
            onClick={() => switchLocale(locale)}
            className={cn(
              'px-1.5 py-0.5 text-xs transition-colors duration-200',
              locale === currentLocale
                ? 'text-foreground font-bold'
                : 'text-muted-foreground hover:text-foreground font-medium',
            )}
          >
            {LOCALE_LABELS[locale]}
          </button>
          {index < LOCALES.length - 1 && (
            <span className="text-xs text-muted-foreground/50">/</span>
          )}
        </span>
      ))}
    </div>
  );
}
