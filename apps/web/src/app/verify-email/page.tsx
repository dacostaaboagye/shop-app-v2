import { VerifyEmailClient } from "@/components/auth/verify-email-client";
import { AuthPageShell } from "@/components/system/auth-page-shell";
import {
  AuthCard,
  AuthCardBody,
  AuthCardHeader,
} from "@/components/system/auth-surfaces";

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { token } = await searchParams;

  return (
    <AuthPageShell>
      <AuthCard>
        <AuthCardHeader
          description="Confirm your email address to finish setting up your account."
          title="Verify Email"
        />
        <AuthCardBody>
          <VerifyEmailClient token={token} />
        </AuthCardBody>
      </AuthCard>
    </AuthPageShell>
  );
}
