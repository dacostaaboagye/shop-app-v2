"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AtSign, FlaskConical, History, MailCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppErrorBanner } from "@/components/system/app-error";
import { StatCard } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  emailOperationsQueryKey,
  fetchEmailOperations,
  sendTestEmail,
} from "@/lib/react-query/official-documents";

export function EmailOperationsPanel({
  defaultTargetEmail,
  canManage,
}: {
  canManage: boolean;
  defaultTargetEmail: string;
}) {
  const queryClient = useQueryClient();
  const [targetEmail, setTargetEmail] = useState(defaultTargetEmail);
  const operationsQuery = useQuery({
    queryFn: fetchEmailOperations,
    queryKey: emailOperationsQueryKey,
  });
  const sendMutation = useMutation({
    mutationFn: sendTestEmail,
    onSuccess() {
      toast.success("Test email sent.");
      void queryClient.invalidateQueries({ queryKey: emailOperationsQueryKey });
    },
  });

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
            value={operationsQuery.data.recentAttempts.length}
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
              !canManage || sendMutation.isPending || targetEmail.trim() === ""
            }
            onClick={() =>
              sendMutation.mutate({ targetEmail: targetEmail.trim() })
            }
            type="button"
          >
            {sendMutation.isPending ? "Sending..." : "Send test email"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm shadow-black/[0.04]">
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
                    <p className="text-xs text-muted-foreground">
                      {attempt.recipientEmail} ·{" "}
                      {attempt.messageType.replaceAll("_", " ")}
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
