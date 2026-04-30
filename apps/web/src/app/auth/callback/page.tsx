import { AuthCallbackPageClient } from "./auth-callback-page-client";

type AuthCallbackPageProps = {
  searchParams: Promise<{ oauth_error?: string }>;
};

export default async function AuthCallbackPage({
  searchParams,
}: AuthCallbackPageProps) {
  const { oauth_error: oauthError } = await searchParams;

  return <AuthCallbackPageClient oauthError={oauthError ?? null} />;
}
