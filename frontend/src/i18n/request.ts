import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

const SUPPORTED_LOCALES = ['uz', 'en', 'ru'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('locale')?.value;
  const locale: Locale =
    cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale as Locale)
      ? (cookieLocale as Locale)
      : 'uz';

  return {
    locale,
    messages: (await import(`@/i18n/${locale}.json`)).default,
  };
});
