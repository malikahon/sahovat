'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { HeartHandshake, Globe, Mail, Share2 } from 'lucide-react';

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
            <div className="flex items-center gap-2">
              <HeartHandshake className="size-6 text-primary" />
              <span className="text-lg font-bold text-foreground">SAHOVAT</span>
            </div>
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
              {['aboutUs', 'howItWorks', 'trustSafety', 'transparency'].map(
                (key) => (
                  <li key={key}>
                    <Link
                      href="#"
                      className="text-sm text-muted-foreground transition-colors duration-200 hover:text-primary"
                    >
                      {t(key)}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>

          {/* Resources links */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-foreground">
              {t('resources')}
            </h3>
            <ul className="mt-4 space-y-3">
              {['helpCenter', 'organizerGuidelines', 'impactStories', 'contact'].map(
                (key) => (
                  <li key={key}>
                    <Link
                      href="#"
                      className="text-sm text-muted-foreground transition-colors duration-200 hover:text-primary"
                    >
                      {t(key)}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-primary/10 pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} {t('copyright')}
          </p>
          <div className="flex items-center gap-2">
            {[
              { icon: Globe, href: '#' },
              { icon: Mail, href: '#' },
              { icon: Share2, href: '#' },
            ].map(({ icon: Icon, href }, i) => (
              <Link
                key={i}
                href={href}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border/50 text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
              >
                <Icon className="size-4" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
