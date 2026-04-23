"use client";

import { useMutation } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { useState } from "react";
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
    <div className="fixed bottom-6 right-6 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-xl border border-warning/20 bg-white p-4 shadow-sm backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
            <MailCheck className="size-5" />
          </div>
          <div className="flex flex-col gap-3 pt-0.5">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold text-foreground">
                Email Verification
              </p>
              <p className="max-w-[240px] text-xs font-medium leading-relaxed text-muted-foreground">
                {sent
                  ? "Verification email sent — check your inbox."
                  : "Please verify your email address to access all features."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!sent && (
                <Button
                  disabled={resendMutation.isPending}
                  onClick={() => void resendMutation.mutateAsync()}
                  size="sm"
                  variant="warning"
                  className="h-8 rounded-lg px-3 text-[10px] font-bold uppercase tracking-wider"
                >
                  {resendMutation.isPending ? (
                    <Spinner data-icon="inline-start" />
                  ) : null}
                  Resend
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                onClick={() => setDismissed(true)}
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
