import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Logo } from '@/components/shared/Logo';

const PLATFORM_LINKS: { key: string; href: string }[] = [
  { key: 'aboutUs', href: '/about' },
  { key: 'howItWorks', href: '/how-it-works' },
  { key: 'trustSafety', href: '/trust-safety' },
  { key: 'transparency', href: '/transparency' },
];

const RESOURCE_LINKS: { key: string; href: string }[] = [
  { key: 'helpCenter', href: '/help' },
  { key: 'organizerGuidelines', href: '/organizer-guidelines' },
  { key: 'contact', href: '/contact' },
];

export function Footer() {
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative border-t border-primary/10 bg-card/30">
      {/* Top gradient line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Branding */}
          <div>
            <Logo size="md" asStatic />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t('tagline')}
            </p>
          </div>

          {/* Platform links */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-foreground">
              {t('platform')}
            </h3>
            <ul className="mt-4 space-y-3">
              {PLATFORM_LINKS.map(({ key, href }) => (
                <li key={key}>
                  <Link
                    href={href}
                    className="text-sm text-muted-foreground transition-colors duration-200 hover:text-primary"
                  >
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources links */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-foreground">
              {t('resources')}
            </h3>
            <ul className="mt-4 space-y-3">
              {RESOURCE_LINKS.map(({ key, href }) => (
                <li key={key}>
                  <Link
                    href={href}
                    className="text-sm text-muted-foreground transition-colors duration-200 hover:text-primary"
                  >
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-primary/10 pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} {t('copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}
