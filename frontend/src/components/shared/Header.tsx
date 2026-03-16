'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Menu, X, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', labelKey: 'home' },
  { href: '/campaigns', labelKey: 'browse' },
];

export function Header() {
  const t = useTranslations('nav');
  const tAuth = useTranslations('auth');
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isHome = pathname === '/';

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled || !isHome
            ? 'glass border-b border-border/50 shadow-warm-xs'
            : 'bg-transparent',
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-warm-xs">
              <Heart className="h-4 w-4 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Sahovat
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sage-100 text-sage-700'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {t(link.labelKey)}
                </Link>
              );
            })}
          </nav>

          {/* Desktop right side */}
          <div className="hidden items-center gap-3 md:flex">
            {!isLoading && (
              <>
                {isAuthenticated ? (
                  <Button asChild size="sm" className="shadow-warm-xs">
                    <Link href="/dashboard">{t('dashboard')}</Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/login">{tAuth('login')}</Link>
                    </Button>
                    <Button size="sm" className="shadow-warm-xs" asChild>
                      <Link href="/login">{tAuth('register')}</Link>
                    </Button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile menu */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-in-out md:hidden',
            mobileOpen ? 'max-h-80' : 'max-h-0',
          )}
        >
          <div className="glass border-t border-border/50 px-4 pb-4 pt-2">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const isActive =
                  link.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sage-100 text-sage-700'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {t(link.labelKey)}
                  </Link>
                );
              })}
            </nav>

            {!isLoading && (
              <div className="mt-3 flex flex-col gap-2 border-t border-border/50 pt-3">
                {isAuthenticated ? (
                  <Button asChild size="sm" className="w-full shadow-warm-xs">
                    <Link href="/dashboard">{t('dashboard')}</Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" size="sm" asChild className="w-full">
                      <Link href="/login">{tAuth('login')}</Link>
                    </Button>
                    <Button size="sm" className="w-full shadow-warm-xs" asChild>
                      <Link href="/login">{tAuth('register')}</Link>
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Spacer to prevent content from going under fixed header */}
      <div className="h-16" />
    </>
  );
}
