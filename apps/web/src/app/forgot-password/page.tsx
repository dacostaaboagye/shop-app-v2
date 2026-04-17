import Link from "next/link";
import { AuthForgotPasswordForm } from "@/components/forms/auth-forgot-password-form";
import { AuthPageShell } from "@/components/system/auth-page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toRoute } from "@/lib/routes";

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell>
      <Card className="border border-border bg-card shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="font-sans text-lg font-semibold">
            Reset your password
          </CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <AuthForgotPasswordForm />
          <p className="text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link
              className="text-sm font-medium underline-offset-4 hover:underline"
              href={toRoute("/login")}
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
