'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Require user to be authenticated. Redirects to /login if not. */
  requireAuth?: boolean;
  /** Require user to have verification_status = 'approved'. Redirects to /dashboard. */
  requireVerified?: boolean;
  /** Require user to be an admin. Redirects to /dashboard. */
  requireAdmin?: boolean;
}

/**
 * Wrapper component that enforces auth/role guards.
 *
 * Usage:
 *   <ProtectedRoute requireAuth>...</ProtectedRoute>
 *   <ProtectedRoute requireAuth requireAdmin>...</ProtectedRoute>
 *   <ProtectedRoute requireAuth requireVerified>...</ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  requireAuth: needsAuth = false,
  requireVerified = false,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const t = useTranslations('auth');

  useEffect(() => {
    if (isLoading) return;

    // Check authentication
    if (needsAuth && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    // Check admin
    if (requireAdmin && !user?.is_admin) {
      router.replace('/dashboard');
      return;
    }

    // Check verified
    if (requireVerified && user?.verification_status !== 'approved') {
      router.replace('/dashboard');
      return;
    }
  }, [isLoading, isAuthenticated, user, needsAuth, requireAdmin, requireVerified, router]);

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t('loginRequired')}</p>
        </div>
      </div>
    );
  }

  // Don't render children if checks fail (redirect is in progress)
  if (needsAuth && !isAuthenticated) return null;
  if (requireAdmin && !user?.is_admin) return null;
  if (requireVerified && user?.verification_status !== 'approved') return null;

  return <>{children}</>;
}
