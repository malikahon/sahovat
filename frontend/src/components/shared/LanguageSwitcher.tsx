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
    <div className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-sm">
      {LOCALES.map((locale, i) => (
        <span key={locale} className="flex items-center">
          {i > 0 && (
            <span className="mx-1.5 text-muted-foreground/50">/</span>
          )}
          <button
            onClick={() => switchLocale(locale)}
            className={cn(
              'transition-colors',
              locale === currentLocale
                ? 'font-bold text-foreground'
                : 'font-medium text-muted-foreground hover:text-foreground',
            )}
          >
            {LOCALE_LABELS[locale]}
          </button>
        </span>
      ))}
    </div>
  );
}
