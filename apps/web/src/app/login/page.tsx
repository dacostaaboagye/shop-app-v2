import { AuthPageShell } from "@/components/system/auth-page-shell";
import { AuthWorkspace } from "@/components/system/auth-workspace";

export default function LoginPage() {
  return (
    <AuthPageShell>
      <AuthWorkspace mode="login" />
    </AuthPageShell>
  );
}
