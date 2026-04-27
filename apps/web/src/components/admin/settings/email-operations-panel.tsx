"use client";

import { Separator } from "@base-ui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RecipientStatePanel } from "@/components/admin/settings/email-recipient-state-panel";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  emailOperationsQueryKey,
  emailRecipientStateQueryKey,
  fetchEmailOperations,
  fetchEmailRecipientState,
  sendTestEmail,
} from "@/lib/react-query/official-documents";
import {
  EmailDeliveryStatusBadge,
  formatEmailTimestamp,
  isValidEmail,
} from "./email-operations-support";
import { canSendToRecipient } from "./email-recipient-state.support";

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

      <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm shadow-black/[0.04]">
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-semibold text-foreground">
            Test delivery
          </h3>
          <p className="type-support text-muted-foreground">
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
              !canSendToRecipient(recipientStateQuery.data)
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
          <h3 className="text-base font-semibold text-foreground">
            Recent delivery attempts
          </h3>
          <p className="type-support text-muted-foreground">
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
                  className="grid gap-3 bg-background px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] md:items-start"
                  key={`${attempt.createdAt}-${attempt.recipientEmail}-${attempt.subject}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-foreground">
                      {attempt.subject}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      <span className="break-all">
                        {attempt.recipientEmail}
                      </span>
                      <Separator orientation="vertical" className="h-4" />
                      <span className="break-words">
                        {attempt.messageType.replaceAll("_", " ")}
                      </span>
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-col items-start gap-1 text-xs text-muted-foreground md:items-end">
                    <EmailDeliveryStatusBadge status={attempt.status} />
                    <span>
                      {formatEmailTimestamp(attempt.statusRecordedAt)}
                    </span>
                    {attempt.failureReason ? (
                      <span className="break-words md:max-w-[24rem] md:text-right">
                        {attempt.failureReason}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <AppEmptyState
              className="m-4"
              description="No transactional email attempts have been recorded yet."
              title="No delivery attempts"
            />
          )}
        </div>
      </div>
    </div>
  );
}
