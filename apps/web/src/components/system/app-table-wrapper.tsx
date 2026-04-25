export function AppTableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {children}
    </div>
  );
}
