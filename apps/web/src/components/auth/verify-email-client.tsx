"use client";

import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { verifyEmail } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/auth-messages";
import { toRoute } from "@/lib/routes";

type VerifyEmailClientProps = {
  token: string | undefined;
};

export function VerifyEmailClient({ token }: VerifyEmailClientProps) {
  const mutation = useMutation({
    mutationFn: (t: string) => verifyEmail(t),
  });

  useEffect(() => {
    if (token) {
      mutation.mutate(token);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutation.mutate, token]);

  if (!token) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Invalid link</AlertTitle>
        <AlertDescription>
          This verification link is missing a token. Use the link from your
          email, or request a new verification email from your account.
        </AlertDescription>
      </Alert>
    );
  }

  if (mutation.isPending || mutation.isIdle) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <Spinner className="h-6 w-6" />
        <p className="text-sm text-muted-foreground">Verifying your email…</p>
      </div>
    );
  }

  if (mutation.isError) {
    const error = getAuthErrorMessage(mutation.error);
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>{error.title}</AlertTitle>
          <AlertDescription>{error.detail}</AlertDescription>
        </Alert>
        <Link
          className={buttonVariants({
            variant: "outline",
            className: "w-full",
          })}
          href={toRoute("/login")}
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert variant="success">
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Email verified</AlertTitle>
        <AlertDescription>
          Your email address has been confirmed. You now have full access to
          your account.
        </AlertDescription>
      </Alert>
      <Link
        className={buttonVariants({ className: "w-full", size: "lg" })}
        href={toRoute("/login")}
      >
        Continue to sign in
      </Link>
    </div>
  );
}
