import { VerifyEmailClient } from "@/components/auth/verify-email-client";
import { AuthPageShell } from "@/components/system/auth-page-shell";

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { token } = await searchParams;

  return (
    <AuthPageShell>
      <VerifyEmailClient token={token} />
    </AuthPageShell>
  );
}
