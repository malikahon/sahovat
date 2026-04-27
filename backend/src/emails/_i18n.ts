/**
 * Tiny translation helper for email templates.
 *
 * Keeping i18n inline (no next-intl on the backend) lets templates ship as
 * pure React components renderable to HTML at any time. Each template
 * imports `t(locale, dict, key)` to resolve a copy string.
 */

export type EmailLocale = 'uz' | 'ru' | 'en';

export const EMAIL_SUPPORTED_LOCALES: readonly EmailLocale[] = ['uz', 'ru', 'en'];

export function normalizeEmailLocale(input: string | null | undefined): EmailLocale {
  if (input && (EMAIL_SUPPORTED_LOCALES as readonly string[]).includes(input)) {
    return input as EmailLocale;
  }
  return 'uz';
}

export type LocaleDict<K extends string> = Record<EmailLocale, Record<K, string>>;

/**
 * Pick a string from a locale dictionary. Falls back to 'uz' when the
 * key is missing in the requested locale (defensive — should never happen
 * if dictionaries are exhaustive).
 */
export function t<K extends string>(
  dict: LocaleDict<K>,
  locale: EmailLocale,
  key: K,
): string {
  return dict[locale][key] ?? dict.uz[key];
}

/**
 * Format a UZS amount with thousands separator, no decimals.
 * Locale-agnostic — Uzbek/Russian/English all use space-grouped numerals
 * acceptably. Uses 'en-US' for stability across Node versions.
 */
export function formatUzs(amount: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(amount));
}
