export function AppTableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      {children}
    </div>
  );
}
