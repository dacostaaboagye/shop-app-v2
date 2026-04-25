import { ResetPasswordClient } from "@/components/auth/reset-password-client";
import { AuthPageShell } from "@/components/system/auth-page-shell";
import {
  AuthCard,
  AuthCardBody,
  AuthCardHeader,
  AuthFooterLink,
} from "@/components/system/auth-surfaces";
import { toRoute } from "@/lib/routes";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <AuthPageShell>
      <AuthCard>
        <AuthCardHeader
          description="Choose a strong password for your account."
          title="New Password"
        />
        <AuthCardBody>
          <ResetPasswordClient token={token} />
          <AuthFooterLink
            href={toRoute("/login")}
            label="Sign In"
            prompt="Back to"
          />
        </AuthCardBody>
      </AuthCard>
    </AuthPageShell>
  );
}
