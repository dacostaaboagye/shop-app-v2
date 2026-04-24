"use client";

import { Separator } from "@base-ui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AtSign, FlaskConical, History, MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RecipientStatePanel } from "@/components/admin/settings/email-recipient-state-panel";
import { AppErrorBanner } from "@/components/system/app-error";
import { StatCard } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  emailOperationsQueryKey,
  emailRecipientStateQueryKey,
  fetchEmailOperations,
  fetchEmailRecipientState,
  sendTestEmail,
} from "@/lib/react-query/official-documents";

export function EmailOperationsPanel({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const [targetEmail, setTargetEmail] = useState("");
  const [debouncedTargetEmail, setDebouncedTargetEmail] = useState("");
  const operationsQuery = useQuery({
    queryFn: fetchEmailOperations,
    queryKey: emailOperationsQueryKey,
  });
  const normalizedTargetEmail = debouncedTargetEmail.trim().toLowerCase();
  const recipientStateQuery = useQuery({
    enabled: isValidEmail(normalizedTargetEmail),
    queryFn: () => fetchEmailRecipientState(normalizedTargetEmail),
    queryKey: emailRecipientStateQueryKey(normalizedTargetEmail),
  });
  const sendMutation = useMutation({
    mutationFn: sendTestEmail,
    onSuccess() {
      toast.success("Test email sent.");
      void queryClient.invalidateQueries({ queryKey: emailOperationsQueryKey });
    },
  });

  useEffect(() => {
    if (operationsQuery.data && targetEmail === "") {
      setTargetEmail(operationsQuery.data.supportEmail);
    }
  }, [operationsQuery.data, targetEmail]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedTargetEmail(targetEmail);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [targetEmail]);

  return (
    <div className="flex flex-col gap-5">
      {operationsQuery.isError ? (
        <AppErrorBanner
          detail="Could not load email operations."
          error={operationsQuery.error}
          onRetry={() => void operationsQuery.refetch()}
          title="Email operations unavailable"
        />
      ) : null}

      {operationsQuery.data ? (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            description={
              operationsQuery.data.providerConfigured
                ? "Resend is configured for live delivery."
                : "Email is using console fallback mode."
            }
            icon={
              operationsQuery.data.providerConfigured ? MailCheck : FlaskConical
            }
            label="Delivery mode"
            value={operationsQuery.data.mode.replaceAll("_", " ")}
          />
          <StatCard
            description={operationsQuery.data.replyToAddress}
            icon={AtSign}
            label="Reply-to"
            value={operationsQuery.data.supportEmail}
          />
          <StatCard
            description="Most recent delivery attempts recorded by the API."
            icon={History}
            label="Recent attempts"
            value={`Last ${operationsQuery.data.recentAttempts.length}`}
          />
        </div>
      ) : null}

      <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm shadow-black/[0.04]">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
            Test delivery
          </h3>
          <p className="text-sm text-muted-foreground">
            Send a live branded test email through the current messaging
            configuration.
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Input
            disabled={!canManage || sendMutation.isPending}
            onChange={(event) => setTargetEmail(event.target.value)}
            type="email"
            value={targetEmail}
          />
          <Button
            disabled={
              !canManage ||
              sendMutation.isPending ||
              targetEmail.trim() === "" ||
              recipientStateQuery.data?.canSend === false
            }
            onClick={() =>
              sendMutation.mutate({ targetEmail: targetEmail.trim() })
            }
            type="button"
          >
            {sendMutation.isPending ? "Sending..." : "Send test email"}
          </Button>
        </div>
        <RecipientStatePanel
          email={normalizedTargetEmail}
          query={recipientStateQuery}
        />
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm shadow-black/4">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
            Recent delivery attempts
          </h3>
          <p className="text-sm text-muted-foreground">
            Latest transactional email activity, including provider lifecycle
            updates.
          </p>
        </div>
        <div className="mt-5 overflow-hidden rounded-xl border border-border/60">
          {operationsQuery.isPending ? (
            <div className="p-4 text-sm text-muted-foreground">
              Loading email activity...
            </div>
          ) : operationsQuery.data?.recentAttempts.length ? (
            <div className="divide-y divide-border/60">
              {operationsQuery.data.recentAttempts.map((attempt) => (
                <div
                  className="flex flex-col gap-2 bg-background px-4 py-3 md:flex-row md:items-start md:justify-between"
                  key={`${attempt.createdAt}-${attempt.recipientEmail}-${attempt.subject}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {attempt.subject}
                    </p>
                    <p className="flex gap-1 text-xs text-muted-foreground">
                      <span className="text-nowrap">
                        {attempt.recipientEmail}
                      </span>
                      <Separator orientation="vertical" className="h-4" />
                      <span className="text-nowrap">
                        {attempt.messageType.replaceAll("_", " ")}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-1 text-xs text-muted-foreground md:items-end">
                    <span className="font-semibold text-foreground">
                      {formatDeliveryStatus(attempt.status)}
                    </span>
                    <span>
                      {new Date(attempt.statusRecordedAt).toLocaleString(
                        "en-GB",
                      )}
                    </span>
                    {attempt.failureReason ? (
                      <span>{attempt.failureReason}</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-sm text-muted-foreground">
              No delivery attempts recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDeliveryStatus(status: string) {
  switch (status) {
    case "sent":
      return "Accepted by provider";
    case "delivered":
      return "Delivered";
    case "delayed":
      return "Delivery delayed";
    case "bounced":
      return "Bounced";
    case "complained":
      return "Complained";
    case "suppressed":
      return "Suppressed";
    case "console_fallback":
      return "Console fallback";
    case "failed":
      return "Failed";
    default:
      return status.replaceAll("_", " ");
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
