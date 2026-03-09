import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  const locale = 'uz'; // will read from cookie/user preference later

  return {
    locale,
    messages: (await import(`@/i18n/${locale}.json`)).default,
  };
});
