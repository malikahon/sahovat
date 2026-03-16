'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('auth');

  return (
    <div className="flex min-h-screen">
      {/* Left decorative panel — hidden on mobile */}
      <div className="relative hidden w-1/2 overflow-hidden bg-sage-900 lg:flex lg:flex-col lg:justify-between">
        {/* Background pattern */}
        <div className="absolute inset-0 pattern-ikat opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-br from-sage-900/95 via-sage-800/90 to-sage-900/95" />

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col justify-between p-10 xl:p-14">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sage-500/80">
              <Heart className="h-4.5 w-4.5 text-white" fill="currentColor" />
            </div>
            <span className="text-xl font-bold text-sage-50">
              Sahovat
            </span>
          </div>

          {/* Center message */}
          <div className="max-w-md">
            <h1 className="text-3xl font-bold leading-tight text-sage-50 xl:text-4xl">
              {t('authTagline')}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-sage-300">
              {t('welcomeSubtitle')}
            </p>

            {/* Decorative stats */}
            <div className="mt-10 grid grid-cols-3 gap-6">
              <div>
                <p className="text-2xl font-bold text-sage-100">45M+</p>
                <p className="mt-1 text-xs text-sage-400">UZS Raised</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-sage-100">120+</p>
                <p className="mt-1 text-xs text-sage-400">Campaigns</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-sage-100">2.4K+</p>
                <p className="mt-1 text-xs text-sage-400">Donors</p>
              </div>
            </div>
          </div>

          {/* Bottom decorative quote */}
          <div className="max-w-sm">
            <blockquote className="border-l-2 border-sage-600 pl-4">
              <p className="text-sm italic leading-relaxed text-sage-400">
                &ldquo;The best of people are those who are most beneficial to others.&rdquo;
              </p>
            </blockquote>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full border border-sage-700/30" />
        <div className="absolute -bottom-10 -right-10 h-60 w-60 rounded-full border border-sage-700/20" />
        <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-sage-700/10" />
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col bg-background">
        {/* Mobile header */}
        <div className="flex items-center justify-between px-6 pt-6 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-warm-xs">
              <Heart className="h-4 w-4 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="text-lg font-bold text-foreground">Sahovat</span>
          </Link>
        </div>

        {/* Desktop return link */}
        <div className="hidden items-center justify-end px-8 pt-6 lg:flex">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to Home
          </Link>
        </div>

        {/* Centered form area */}
        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-8">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
