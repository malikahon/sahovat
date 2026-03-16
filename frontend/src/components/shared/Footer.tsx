'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';

export function Footer() {
  const t = useTranslations('footer');
  const tNav = useTranslations('nav');

  return (
    <footer className="border-t border-border bg-sage-900 text-sage-300">
      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage-500">
                <Heart className="h-4 w-4 text-white" fill="currentColor" />
              </div>
              <span className="text-lg font-bold text-sage-50">
                Sahovat
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-sage-400">
              {t('description')}
            </p>
          </div>

          {/* Platform links */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sage-200">
              {t('platform')}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/campaigns"
                  className="text-sm text-sage-400 transition-colors hover:text-sage-100"
                >
                  {tNav('browse')}
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-sm text-sage-400 transition-colors hover:text-sage-100"
                >
                  {t('startCampaign')}
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-sm text-sage-400 transition-colors hover:text-sage-100"
                >
                  {t('donate')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support links */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sage-200">
              {t('support')}
            </h3>
            <ul className="space-y-2">
              <li>
                <span className="text-sm text-sage-400">{t('howItWorks')}</span>
              </li>
              <li>
                <span className="text-sm text-sage-400">{t('faq')}</span>
              </li>
              <li>
                <span className="text-sm text-sage-400">{t('contact')}</span>
              </li>
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sage-200">
              {t('legal')}
            </h3>
            <ul className="space-y-2">
              <li>
                <span className="text-sm text-sage-400">{t('terms')}</span>
              </li>
              <li>
                <span className="text-sm text-sage-400">{t('privacy')}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mt-10 grid grid-cols-3 gap-4 rounded-xl border border-sage-700/50 bg-sage-800/30 p-5">
          <div className="text-center">
            <p className="text-xl font-bold text-sage-100 sm:text-2xl">
              45M+
            </p>
            <p className="mt-0.5 text-xs text-sage-400 sm:text-sm">{t('statsRaised')}</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-sage-100 sm:text-2xl">
              120+
            </p>
            <p className="mt-0.5 text-xs text-sage-400 sm:text-sm">{t('statsCampaigns')}</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-sage-100 sm:text-2xl">
              2,400+
            </p>
            <p className="mt-0.5 text-xs text-sage-400 sm:text-sm">{t('statsDonors')}</p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-sage-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-xs text-sage-500">
            {t('copyright', { year: new Date().getFullYear() })}
          </p>
          <p className="text-xs text-sage-500">
            {t('madeIn')}
          </p>
        </div>
      </div>
    </footer>
  );
}
