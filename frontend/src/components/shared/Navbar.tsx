'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Menu, X, HeartHandshake, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { cn } from '@/lib/utils';

interface NavbarProps {
  variant?: 'public' | 'authenticated';
}

export function Navbar({ variant = 'public' }: NavbarProps) {
  const t = useTranslations('nav');
  const tAuth = useTranslations('auth');
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const publicLinks = [
    { href: '/', label: t('home') },
    { href: '/campaigns', label: t('about') },
  ];

  const authLinks = [
    { href: '/campaigns', label: t('discover') },
    { href: '/my-campaigns', label: t('projects') },
    { href: '/dashboard', label: t('impact') },
    { href: '/my-donations', label: t('myDonations') },
  ];

  const links = variant === 'authenticated' ? authLinks : publicLinks;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      {/* Subtle sage gradient line at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="relative">
            <HeartHandshake className="size-7 text-primary transition-transform duration-300 group-hover:scale-110" />
            <div className="absolute inset-0 animate-sage-pulse rounded-full bg-primary/20 blur-md" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            SAHOVAT
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'relative rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                pathname === link.href
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              )}
            >
              {link.label}
              {/* Active indicator dot */}
              {pathname === link.href && (
                <span className="absolute inset-x-0 -bottom-[13px] mx-auto h-0.5 w-6 rounded-full bg-primary" />
              )}
            </Link>
          ))}
        </nav>

        {/* Right section: Language | CTA */}
        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher />
          <div className="ml-1 h-5 w-px bg-border" />
          {variant === 'authenticated' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-primary/30 text-primary hover:border-primary hover:bg-primary/10"
                render={<Link href="/create-campaign" />}
              >
                {t('newCampaign')}
              </Button>
              <Button
                size="sm"
                className="rounded-full shadow-md shadow-primary/20 transition-shadow hover:shadow-lg hover:shadow-primary/30"
                render={<Link href="/campaigns" />}
              >
                <Heart className="mr-1.5 size-3.5" />
                {t('makeDonation')}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="rounded-full shadow-md shadow-primary/20 transition-shadow hover:shadow-lg hover:shadow-primary/30"
              render={<Link href="/login" />}
            >
              {tAuth('login')}
            </Button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu — slide down overlay */}
      <div
        className={cn(
          'overflow-hidden border-t border-primary/10 bg-background/95 backdrop-blur-xl transition-all duration-300 ease-in-out md:hidden',
          mobileOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0 border-t-0',
        )}
      >
        <div className="px-4 pb-5 pt-3">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  pathname === link.href
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile language row */}
          <div className="mt-4 flex items-center gap-2">
            <LanguageSwitcher />
          </div>

          {/* Mobile CTAs */}
          <div className="mt-4 flex flex-col gap-2">
            {variant === 'authenticated' ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-full border-primary/30 text-primary"
                  render={<Link href="/create-campaign" />}
                >
                  {t('newCampaign')}
                </Button>
                <Button
                  size="sm"
                  className="w-full rounded-full shadow-md shadow-primary/20"
                  render={<Link href="/campaigns" />}
                >
                  <Heart className="mr-1.5 size-3.5" />
                  {t('makeDonation')}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="w-full rounded-full shadow-md shadow-primary/20"
                render={<Link href="/login" />}
              >
                {tAuth('login')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
