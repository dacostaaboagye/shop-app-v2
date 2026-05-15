import { AuthPageShell } from "@/components/system/auth-page-shell";
import { AuthWorkspace } from "@/components/system/auth-workspace";
import { normalizeSafeNextPath } from "@/lib/auth/auth-redirect";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

  return (
    <AuthPageShell>
      <AuthWorkspace mode="login" nextPath={normalizeSafeNextPath(next)} />
    </AuthPageShell>
  );
}
