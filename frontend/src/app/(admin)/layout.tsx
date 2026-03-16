'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  FolderHeart,
  Wallet,
  Users,
  ShieldCheck,
  Settings,
  ScrollText,
  LogOut,
  Menu,
  X,
  Heart,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AdminNavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
  badge?: number;
}

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: '/admin', labelKey: 'dashboard', icon: <LayoutDashboard className="size-4.5" /> },
  { href: '/admin/campaigns', labelKey: 'campaigns', icon: <FolderHeart className="size-4.5" />, badge: 3 },
  { href: '/admin/withdrawals', labelKey: 'withdrawals', icon: <Wallet className="size-4.5" />, badge: 2 },
  { href: '/admin/users', labelKey: 'users', icon: <Users className="size-4.5" /> },
  { href: '/admin/escrow', labelKey: 'escrow', icon: <ShieldCheck className="size-4.5" /> },
  { href: '/admin/settings', labelKey: 'settings', icon: <Settings className="size-4.5" /> },
  { href: '/admin/audit', labelKey: 'auditLog', icon: <ScrollText className="size-4.5" /> },
];

function AdminSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('admin.sidebar');
  const tAuth = useTranslations('auth');
  const { user, logout } = useAuth();

  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/login');
  }, [logout, router]);

  return (
    <div className="flex h-full flex-col">
      {/* Logo + Admin badge */}
      <div className="px-5 py-5">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage-800">
            <Heart className="h-4 w-4 text-sage-200" fill="currentColor" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-sage-100">
              Sahovat
            </span>
            <Badge variant="secondary" className="bg-sage-700 text-sage-200 text-[10px] px-1.5 py-0">
              Admin
            </Badge>
          </div>
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-sage-700/50" />

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 pt-4">
        {ADMIN_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-sage-700/50 text-sage-100'
                  : 'text-sage-400 hover:bg-sage-800/50 hover:text-sage-200',
              )}
            >
              <span className="flex items-center gap-3">
                {item.icon}
                {t(item.labelKey)}
              </span>
              {item.badge && item.badge > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-terracotta px-1.5 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Admin user info + logout */}
      <div className="border-t border-sage-700/50 px-4 py-4">
        {user && (
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-700 text-sage-200">
              <span className="text-sm font-semibold">
                {(user.display_name || 'A').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-sage-100 truncate">
                {user.display_name || 'Admin'}
              </p>
              <p className="text-xs text-sage-500 truncate">
                {user.phone_number}
              </p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-sage-400 hover:text-sage-200 hover:bg-sage-800/50"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          {tAuth('logout')}
        </Button>
      </div>
    </div>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar — dark sage */}
      <aside className="hidden w-[264px] shrink-0 bg-sage-900 md:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <AdminSidebarContent />
        </div>
      </aside>

      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200 md:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[264px] bg-sage-900 shadow-warm-xl transition-transform duration-200 ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-end px-3 pt-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-sage-400 hover:text-sage-200 hover:bg-sage-800/50"
              onClick={() => setMobileOpen(false)}
            >
              <X className="size-5" />
            </Button>
          </div>
          <AdminSidebarContent onNavigate={() => setMobileOpen(false)} />
        </div>
      </aside>

      {/* Main content */}
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
            Admin Panel
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requireAuth requireAdmin>
      <AdminShell>{children}</AdminShell>
    </ProtectedRoute>
  );
}
