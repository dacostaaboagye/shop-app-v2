"use client";

import type { EmailRecipientStateResponse } from "@shop/contracts";
import type { UseQueryResult } from "@tanstack/react-query";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { Badge } from "@/components/ui/badge";
import { formatEmailTimestamp, isValidEmail } from "./email-operations-support";

export function RecipientStatePanel({
  email,
  query,
}: {
  email: string;
  query: UseQueryResult<EmailRecipientStateResponse>;
}) {
  if (email === "") {
    return null;
  }

  if (!isValidEmail(email)) {
    return (
      <div className="mt-4">
        <AppEmptyState
          className="px-4 py-6"
          description="Enter a valid email address to check current delivery state."
          kind="no-results"
          title="Recipient check unavailable"
        />
      </div>
    );
  }

  if (query.isPending) {
    return (
      <div className="mt-4 rounded-xl border border-border/60 bg-background px-4 py-3 text-sm text-muted-foreground">
        Checking recipient delivery state...
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="mt-4">
        <AppErrorBanner
          detail="Could not load recipient delivery state."
          error={query.error}
          title="Recipient check unavailable"
        />
      </div>
    );
  }

  if (!query.data) {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-border/60 bg-background px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">
            Recipient state
          </p>
          <p className="type-support text-muted-foreground">
            {query.data.summary}
          </p>
        </div>
        <Badge variant={query.data.canSend ? "secondary" : "destructive"}>
          {query.data.canSend
            ? "Clear to send"
            : formatBlockedStatus(query.data.status)}
        </Badge>
      </div>
      {!query.data.canSend ? (
        <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
          <p>{query.data.recipientEmail}</p>
          <p>Blocked since {formatEmailTimestamp(query.data.occurredAt)}</p>
          {query.data.statusReason ? <p>{query.data.statusReason}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function formatBlockedStatus(status: string | null) {
  switch (status) {
    case "bounced":
      return "Bounced";
    case "complained":
      return "Complained";
    case "suppressed":
      return "Suppressed";
    default:
      return "Blocked";
  }
}
