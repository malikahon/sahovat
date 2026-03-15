'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Menu, X, HeartHandshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { cn } from '@/lib/utils';

interface NavbarProps {
  /** Show authenticated navigation (Discover, Projects, Impact, My Donations) */
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
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <HeartHandshake className="size-7 text-primary" />
          <span className="text-lg font-bold tracking-tight text-foreground">
            SAHOVAT
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm font-medium transition-colors',
                pathname === link.href
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right section */}
        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          {variant === 'authenticated' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-primary text-primary hover:bg-primary/10"
                render={<Link href="/create-campaign" />}
              >
                {t('newCampaign')}
              </Button>
              <Button
                size="sm"
                className="rounded-full"
                render={<Link href="/campaigns" />}
              >
                {t('makeDonation')}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="rounded-full"
              render={<Link href="/login" />}
            >
              {tAuth('login')}
            </Button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  pathname === link.href
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex items-center gap-3">
            <LanguageSwitcher />
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {variant === 'authenticated' ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-full border-primary text-primary"
                  render={<Link href="/create-campaign" />}
                >
                  {t('newCampaign')}
                </Button>
                <Button
                  size="sm"
                  className="w-full rounded-full"
                  render={<Link href="/campaigns" />}
                >
                  {t('makeDonation')}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="w-full rounded-full"
                render={<Link href="/login" />}
              >
                {tAuth('login')}
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
