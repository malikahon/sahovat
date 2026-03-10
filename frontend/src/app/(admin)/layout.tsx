import { ProtectedRoute } from '@/components/shared/ProtectedRoute';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requireAuth requireAdmin>
      <div className="flex min-h-screen bg-background">
        {/* Admin sidebar placeholder */}
        <aside className="w-64 border-r border-border bg-card p-4 hidden md:block">
          <h2 className="text-lg font-semibold text-foreground">Admin</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Admin navigation coming soon.
          </p>
        </aside>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
