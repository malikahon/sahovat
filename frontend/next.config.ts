import createNextIntlPlugin from 'next-intl/plugin';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const withNextIntl = createNextIntlPlugin();

const nextConfig = {
  output: 'standalone' as const,
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      { protocol: 'https' as const, hostname: 'images.unsplash.com' },
      { protocol: 'http' as const, hostname: 'localhost' },
    ],
  },
};

export default withNextIntl(nextConfig);
