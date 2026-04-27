"use client";

import { useMutation } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { resendVerification } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/auth-messages";

export function EmailVerificationBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [sent, setSent] = useState(false);

  const resendMutation = useMutation({
    mutationFn: resendVerification,
    onSuccess() {
      setSent(true);
    },
  });
  const authError = resendMutation.error
    ? getAuthErrorMessage(resendMutation.error)
    : null;

  if (dismissed) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-xl border border-warning/20 bg-card p-4 shadow-sm backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
            <MailCheck className="size-5" />
          </div>
          <div className="flex flex-col gap-3 pt-0.5">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold text-foreground">
                {authError?.title ?? "Email Verification"}
              </p>
              <p className="max-w-[240px] text-xs font-medium leading-relaxed text-muted-foreground">
                {authError?.detail ??
                  (sent
                    ? "Verification email sent. Check your inbox."
                    : "Please verify your email address to access all features.")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!sent ? (
                <Button
                  className="h-8 rounded-lg px-3 text-[10px] font-bold uppercase tracking-wider"
                  disabled={resendMutation.isPending}
                  onClick={() => void resendMutation.mutateAsync()}
                  size="sm"
                  variant="warning"
                >
                  {resendMutation.isPending ? (
                    <Spinner data-icon="inline-start" />
                  ) : null}
                  Resend
                </Button>
              ) : null}
              <Button
                className="h-8 rounded-lg px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                onClick={() => setDismissed(true)}
                size="sm"
                variant="ghost"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
