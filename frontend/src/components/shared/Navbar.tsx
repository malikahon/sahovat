'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Menu, X, HeartHandshake, Heart, User, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Navbar() {
  const t = useTranslations('nav');
  const tAuth = useTranslations('auth');
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const publicLinks = [
    { href: '/', label: t('home') },
    { href: '/campaigns', label: t('about') },
  ];

  const authLinks = [
    { href: '/campaigns', label: t('discover') },
    { href: '/dashboard', label: t('impact') },
  ];

  const links = isAuthenticated ? authLinks : publicLinks;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/');
    setProfileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="relative">
            <HeartHandshake className="size-7 text-primary transition-transform duration-300 group-hover:scale-110" />
            <div className="absolute inset-0 animate-sage-pulse rounded-full bg-primary/20 blur-md" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            SAHOVAT
          </span>
        </Link>

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
              {pathname === link.href && (
                <span className="absolute inset-x-0 -bottom-[13px] mx-auto h-0.5 w-6 rounded-full bg-primary" />
              )}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher />
          <div className="ml-1 h-5 w-px bg-border" />
          
          {isAuthenticated ? (
            <div className="relative" ref={profileRef}>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-full border-primary/30"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <User className="size-4" />
                <span className="max-w-[100px] truncate">
                  {user?.display_name || user?.phone_number?.slice(-9) || 'Profile'}
                </span>
              </Button>
              
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border bg-background py-1 shadow-lg">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
                    onClick={() => setProfileOpen(false)}
                  >
                    <LayoutDashboard className="size-4" />
                    {t('dashboard')}
                  </Link>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
                    onClick={() => setProfileOpen(false)}
                  >
                    <User className="size-4" />
                    {t('profile')}
                  </Link>
                  <hr className="my-1" />
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-accent"
                    onClick={handleLogout}
                  >
                    <LogOut className="size-4" />
                    {tAuth('logout')}
                  </button>
                </div>
              )}
            </div>
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

        <button
          className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

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

          <div className="mt-4 flex items-center gap-2">
            <LanguageSwitcher />
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    <LayoutDashboard className="mr-2 size-4" />
                    {t('dashboard')}
                  </Button>
                </Link>
                <Link href="/profile" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    <User className="mr-2 size-4" />
                    {t('profile')}
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-destructive"
                  onClick={() => {
                    handleLogout();
                    setMobileOpen(false);
                  }}
                >
                  <LogOut className="mr-2 size-4" />
                  {tAuth('logout')}
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
