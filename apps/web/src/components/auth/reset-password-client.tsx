"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AuthResetPasswordForm } from "@/components/forms/auth-reset-password-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { toRoute } from "@/lib/routes";

type ResetPasswordClientProps = {
  token: string | undefined;
};

export function ResetPasswordClient({ token }: ResetPasswordClientProps) {
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Invalid link</AlertTitle>
        <AlertDescription>
          This reset link is missing a token. Request a new one from the forgot
          password page.
        </AlertDescription>
      </Alert>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Password updated</AlertTitle>
          <AlertDescription>
            Your password has been changed. All active sessions have been signed
            out for security.
          </AlertDescription>
        </Alert>
        <Link
          className={buttonVariants({ size: "lg" })}
          href={toRoute("/login")}
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <AuthResetPasswordForm token={token} onSuccess={() => setDone(true)} />
  );
}
