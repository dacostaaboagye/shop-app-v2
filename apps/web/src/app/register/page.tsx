import { AuthPageShell } from "@/components/system/auth-page-shell";
import { AuthWorkspace } from "@/components/system/auth-workspace";

export default function RegisterPage() {
  return (
    <AuthPageShell>
      <AuthWorkspace mode="register" />
    </AuthPageShell>
  );
}
