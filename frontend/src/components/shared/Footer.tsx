'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { HeartHandshake, Globe, Mail, Share2 } from 'lucide-react';

export function Footer() {
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
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
              <li>
                <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t('aboutUs')}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t('howItWorks')}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t('trustSafety')}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t('transparency')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources links */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-foreground">
              {t('resources')}
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t('helpCenter')}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t('organizerGuidelines')}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t('impactStories')}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t('contact')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} {t('copyright')}
          </p>
          <div className="flex items-center gap-4">
            <Link href="#" className="text-muted-foreground transition-colors hover:text-foreground">
              <Globe className="size-4" />
            </Link>
            <Link href="#" className="text-muted-foreground transition-colors hover:text-foreground">
              <Mail className="size-4" />
            </Link>
            <Link href="#" className="text-muted-foreground transition-colors hover:text-foreground">
              <Share2 className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
