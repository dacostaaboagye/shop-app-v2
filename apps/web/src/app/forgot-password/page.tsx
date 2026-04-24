import Link from "next/link";
import { AuthForgotPasswordForm } from "@/components/forms/auth-forgot-password-form";
import { AuthPageShell } from "@/components/system/auth-page-shell";
import { toRoute } from "@/lib/routes";

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell>
      <div className="overflow-hidden rounded-[2.5rem] border border-border/40 bg-card/60 p-10 backdrop-blur-xl shadow-2xl shadow-black/5">
        <div className="mb-10 flex flex-col items-center gap-2 text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Reset password
          </h2>
          <p className="text-base text-muted-foreground">
            Enter your email and we&apos;ll send a reset link.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <AuthForgotPasswordForm />

          <div className="mt-4 flex items-center justify-center gap-2 border-t border-border/20 pt-8 text-sm font-medium text-muted-foreground">
            Remember your password?{" "}
            <Link
              className="font-bold text-primary transition-colors hover:text-primary/80"
              href={toRoute("/login")}
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </AuthPageShell>
  );
}
