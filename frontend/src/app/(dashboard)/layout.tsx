export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar placeholder */}
      <aside className="w-64 border-r border-border bg-card p-4 hidden md:block">
        <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sidebar coming soon.</p>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
