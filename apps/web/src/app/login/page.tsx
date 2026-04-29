import { AuthPageShell } from "@/components/system/auth-page-shell";
import { AuthWorkspace } from "@/components/system/auth-workspace";
import { normalizeSafeNextPath } from "@/lib/auth/auth-redirect";
import { normalizeOAuthCallbackErrorCode } from "@/lib/auth/oauth-error";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; oauth_error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, oauth_error: oauthError } = await searchParams;

  return (
    <AuthPageShell>
      <AuthWorkspace
        mode="login"
        nextPath={normalizeSafeNextPath(next)}
        oauthError={normalizeOAuthCallbackErrorCode(oauthError)}
      />
    </AuthPageShell>
  );
}
