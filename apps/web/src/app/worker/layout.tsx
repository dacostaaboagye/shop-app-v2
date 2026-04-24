import { AuthGuard } from "@/components/system/portal-guard";
import { AppShell } from "@/components/system/portal-shell";

export default function WorkerLayout({
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
