'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Vault,
  Settings,
  ClipboardList,
  LogOut,
  Menu,
  X,
  ArrowDownToLine,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { Logo } from '@/components/shared/Logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', labelKey: 'dashboard', icon: <LayoutDashboard className="size-5" /> },
  { href: '/admin/campaigns', labelKey: 'campaigns', icon: <FolderKanban className="size-5" /> },
  { href: '/admin/users', labelKey: 'users', icon: <Users className="size-5" /> },
  { href: '/admin/escrow', labelKey: 'escrow', icon: <Vault className="size-5" /> },
  { href: '/admin/withdrawals', labelKey: 'withdrawals', icon: <ArrowDownToLine className="size-5" /> },
  { href: '/admin/verifications', labelKey: 'verifications', icon: <ShieldCheck className="size-5" /> },
  { href: '/admin/settings', labelKey: 'settings', icon: <Settings className="size-5" /> },
  { href: '/admin/audit', labelKey: 'auditLog', icon: <ClipboardList className="size-5" /> },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('admin.nav');
  const tAuth = useTranslations('auth');
  const { user, logout } = useAuth();

  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/login');
  }, [logout, router]);

  return (
    <div className="flex h-full flex-col">
      {/* Logo / App name */}
      <div className="px-4 py-5">
        <Logo size="sm" subtitle="Admin Panel" href="/admin" />
      </div>

      {/* Navigation links */}
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          // Exact match for /admin, prefix match for sub-pages
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {item.icon}
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-border px-4 py-4">
        {user && (
          <div className="mb-3">
            <p className="text-sm font-medium text-foreground truncate">
              {user.display_name || user.phone_number}
            </p>
            <p className="text-xs text-muted-foreground">Administrator</p>
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

function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 md:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-lg transition-transform duration-200 ease-in-out md:hidden',
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
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center border-b border-border bg-card px-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <Logo size="sm" subtitle="Admin Panel" href="/admin" className="ml-3" />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-8">{children}</main>
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
