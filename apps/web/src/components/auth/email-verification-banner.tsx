"use client";

import { useMutation } from "@tanstack/react-query";
import { MailCheck, X } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { resendVerification } from "@/lib/auth/auth-client";

export function EmailVerificationBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [sent, setSent] = useState(false);

  const resendMutation = useMutation({
    mutationFn: resendVerification,
    onSuccess() {
      setSent(true);
    },
  });

  if (dismissed) return null;

  return (
    <Alert variant="warning" className="rounded-none border-x-0 border-t-0">
      <MailCheck className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>
          {sent
            ? "Verification email sent — check your inbox."
            : "Please verify your email address to access all features."}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {!sent && (
            <Button
              disabled={resendMutation.isPending}
              onClick={() => void resendMutation.mutateAsync()}
              size="sm"
              variant="outline"
              className="h-7 text-xs"
            >
              {resendMutation.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : null}
              Resend email
            </Button>
          )}
          <button
            aria-label="Dismiss"
            className="rounded p-0.5 hover:bg-accent"
            onClick={() => setDismissed(true)}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
