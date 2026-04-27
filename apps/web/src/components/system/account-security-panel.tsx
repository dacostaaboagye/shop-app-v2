"use client";

import { useMutation } from "@tanstack/react-query";
import { KeyRound, MailCheck } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { forgotPassword } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/auth-messages";

type AccountSecurityPanelProps = {
  email: string;
  hasPassword: boolean;
};

export function AccountSecurityPanel({
  email,
  hasPassword,
}: AccountSecurityPanelProps) {
  const [sent, setSent] = useState(false);
  const resetMutation = useMutation({
    mutationFn: () => forgotPassword(email),
    onSuccess() {
      setSent(true);
    },
  });

  const authError = resetMutation.error
    ? getAuthErrorMessage(resetMutation.error)
    : null;

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 size-4 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium">Security</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage password recovery for this account.
          </p>
          <div className="mt-4 flex flex-col gap-4">
            {!hasPassword ? (
              <Alert>
                <AlertTitle>Password Reset Unavailable</AlertTitle>
                <AlertDescription>
                  This account signs in through an external identity provider.
                  Password reset is not available from this profile.
                </AlertDescription>
              </Alert>
            ) : null}

            {sent ? (
              <Alert variant="success">
                <MailCheck className="size-4" />
                <AlertTitle>Reset Email Sent</AlertTitle>
                <AlertDescription>
                  If this address can receive account mail, a reset link is on
                  its way to {email}.
                </AlertDescription>
              </Alert>
            ) : null}

            {authError ? (
              <Alert variant="destructive">
                <AlertTitle>{authError.title}</AlertTitle>
                <AlertDescription>{authError.detail}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                disabled={resetMutation.isPending || !hasPassword}
                onClick={() => void resetMutation.mutateAsync()}
                type="button"
                variant="outline"
              >
                {resetMutation.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : null}
                Send Password Reset Email
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
