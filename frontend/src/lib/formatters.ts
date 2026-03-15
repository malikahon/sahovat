/**
 * Read the current locale from the cookie (client-side) or default to 'uz'.
 * This avoids having to pass locale through every call site.
 */
function getLocale(): string {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/);
    if (match) return match[1];
  }
  return 'uz';
}

const LOCALE_MAP: Record<string, string> = {
  uz: 'uz-UZ',
  ru: 'ru-RU',
  en: 'en-US',
};

function getIntlLocale(locale?: string): string {
  const l = locale ?? getLocale();
  return LOCALE_MAP[l] ?? 'uz-UZ';
}

/**
 * Format an amount in UZS with locale-aware number formatting.
 * Examples:
 *   uz: "1 000 000 UZS"
 *   ru: "1 000 000 UZS"
 *   en: "1,000,000 UZS"
 */
export function formatUZS(amount: number, locale?: string): string {
  return new Intl.NumberFormat(getIntlLocale(locale)).format(amount) + ' UZS';
}

/**
 * Format a date string with locale-aware formatting.
 */
export function formatDate(dateString: string, locale?: string): string {
  return new Date(dateString).toLocaleDateString(getIntlLocale(locale), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format an Uzbek phone number for display.
 * Input:  "+998901234567" or "998901234567"
 * Output: "+998 90 123 45 67"
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Expect 12 digits: 998 XX XXX XX XX
  if (digits.length === 12 && digits.startsWith('998')) {
    const cc = digits.slice(0, 3);
    const op = digits.slice(3, 5);
    const p1 = digits.slice(5, 8);
    const p2 = digits.slice(8, 10);
    const p3 = digits.slice(10, 12);
    return `+${cc} ${op} ${p1} ${p2} ${p3}`;
  }
  // Fallback: return as-is with + prefix
  return phone.startsWith('+') ? phone : `+${phone}`;
}
