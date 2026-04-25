import { AuthForgotPasswordForm } from "@/components/forms/auth-forgot-password-form";
import { AuthPageShell } from "@/components/system/auth-page-shell";
import {
  AuthCard,
  AuthCardBody,
  AuthCardHeader,
  AuthFooterLink,
} from "@/components/system/auth-surfaces";
import { toRoute } from "@/lib/routes";

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell>
      <AuthCard>
        <AuthCardHeader
          description="Enter your email and we&apos;ll send a reset link."
          title="Reset Password"
        />
        <AuthCardBody>
          <AuthForgotPasswordForm />
          <AuthFooterLink
            href={toRoute("/login")}
            label="Sign In"
            prompt="Remember your password?"
          />
        </AuthCardBody>
      </AuthCard>
    </AuthPageShell>
  );
}
