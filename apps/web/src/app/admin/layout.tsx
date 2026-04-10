import { AuthGuard } from "@/components/system/portal-guard";
import { AppShell } from "@/components/system/portal-shell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
