'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

const LOCALES = ['uz', 'en', 'ru'] as const;
type Locale = (typeof LOCALES)[number];

const LOCALE_CONFIG: Record<Locale, { label: string; flag: string }> = {
  uz: { label: 'UZ', flag: '\u{1F1FA}\u{1F1FF}' },
  en: { label: 'EN', flag: '\u{1F1EC}\u{1F1E7}' },
  ru: { label: 'RU', flag: '\u{1F1F7}\u{1F1FA}' },
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
    <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-card/50 p-0.5 text-sm">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          onClick={() => switchLocale(locale)}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-all duration-200',
            locale === currentLocale
              ? 'bg-primary/15 text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
          )}
        >
          <span className="text-sm leading-none">{LOCALE_CONFIG[locale].flag}</span>
          <span>{LOCALE_CONFIG[locale].label}</span>
        </button>
      ))}
    </div>
  );
}
