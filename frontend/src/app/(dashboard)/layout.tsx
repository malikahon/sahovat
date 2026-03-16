'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  UserCircle,
  FolderHeart,
  Heart,
  CreditCard,
  LogOut,
  Menu,
  X,
  BadgeCheck,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', labelKey: 'dashboard', icon: <LayoutDashboard className="size-4.5" /> },
  { href: '/profile', labelKey: 'profile', icon: <UserCircle className="size-4.5" /> },
  { href: '/my-campaigns', labelKey: 'myCampaigns', icon: <FolderHeart className="size-4.5" /> },
  { href: '/my-donations', labelKey: 'myDonations', icon: <Heart className="size-4.5" /> },
  { href: '/withdrawal-accounts', labelKey: 'withdrawalAccounts', icon: <CreditCard className="size-4.5" /> },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('nav');
  const tAuth = useTranslations('auth');
  const { user, logout } = useAuth();

  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/login');
  }, [logout, router]);

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage-600 shadow-warm-xs">
            <Heart className="h-4 w-4 text-white" fill="currentColor" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Sahovat
          </span>
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-border/60" />

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 pt-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-sage-100 text-sage-700 shadow-warm-xs'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              {item.icon}
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-border/60 px-4 py-4">
        {user && (
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-200 text-sage-700">
              <span className="text-sm font-semibold">
                {(user.display_name || user.phone_number).charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.display_name || user.phone_number}
                </p>
                {user.is_verified && (
                  <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sage-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {user.phone_number}
              </p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          {tAuth('logout')}
        </Button>
      </div>
    </div>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-[264px] shrink-0 border-r border-border/60 bg-sidebar md:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200 md:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[264px] bg-sidebar shadow-warm-xl transition-transform duration-200 ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-end px-3 pt-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(false)}
            >
              <X className="size-5" />
            </Button>
          </div>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center border-b border-border/60 bg-card px-4 shadow-warm-xs md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <span className="ml-3 text-sm font-semibold text-foreground">
            Sahovat
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requireAuth>
      <DashboardShell>{children}</DashboardShell>
    </ProtectedRoute>
  );
}
