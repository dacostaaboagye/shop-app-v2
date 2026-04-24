export function AppTableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-border">
      {children}
    </div>
  );
}
