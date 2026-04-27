"use client";

import { useQuery } from "@tanstack/react-query";
import { Mail, Search, SendHorizonal } from "lucide-react";
import { useMemo, useState } from "react";
import { AppPagination } from "@/components/data-table/app-pagination";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNotificationTimeLabel } from "@/lib/notifications/notification-presentation";
import {
  adminSentCommunicationsQueryKey,
  fetchAdminSentCommunications,
} from "@/lib/react-query/notifications";

const SENT_PAGE_SIZE = 10;
const SKELETON_KEYS = [
  "sent-communication-1",
  "sent-communication-2",
  "sent-communication-3",
] as const;

export function AdminSentCommunicationsPanel() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");

  const sentQuery = useQuery({
    placeholderData: (previous) => previous,
    queryFn: () =>
      fetchAdminSentCommunications({
        page,
        pageSize: SENT_PAGE_SIZE,
        q: query.trim(),
      }),
    queryKey: adminSentCommunicationsQueryKey({
      page,
      pageSize: SENT_PAGE_SIZE,
      q: query.trim(),
    }),
  });

  const totalCount = sentQuery.data?.totalCount ?? 0;
  const hasItems = (sentQuery.data?.items.length ?? 0) > 0;
  const summary = useMemo(() => {
    if (!query.trim()) {
      return `${totalCount} sent update${totalCount === 1 ? "" : "s"} in the outbox.`;
    }

    return `${totalCount} sent update${totalCount === 1 ? "" : "s"} matching "${query.trim()}".`;
  }, [query, totalCount]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <SendHorizonal className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">
            Sent Updates
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Review operational broadcasts and direct staff messages sent from this
          workspace.
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
            placeholder="Search subject, message body, actor, or recipient"
            value={query}
          />
        </div>
        <p className="text-sm text-muted-foreground">{summary}</p>
      </div>

      <AppTableWrapper>
        {sentQuery.isPending && !sentQuery.data ? (
          <div className="flex flex-col gap-3 p-4">
            {SKELETON_KEYS.map((key) => (
              <Skeleton className="h-32 w-full rounded-xl" key={key} />
            ))}
          </div>
        ) : sentQuery.isError ? (
          <div className="p-4">
            <AppErrorBanner
              error={sentQuery.error}
              onRetry={() => void sentQuery.refetch()}
              title="Sent updates could not be loaded"
            />
          </div>
        ) : hasItems ? (
          <div className="flex flex-col divide-y divide-border/60">
            {sentQuery.data?.items.map((item) => (
              <article className="flex flex-col gap-3 p-4" key={item.eventId}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="type-data-value">{item.subject}</p>
                      <Badge variant="outline">
                        {item.deliveryStatus.replace("_", " ")}
                      </Badge>
                      {item.sendNotification ? (
                        <Badge variant="outline">In-App</Badge>
                      ) : null}
                      {item.sendEmail ? (
                        <Badge variant="outline">Email</Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
                      {item.messageBody}
                    </p>
                  </div>
                  <div className="flex min-w-0 flex-col items-start gap-1 text-xs text-muted-foreground md:items-end">
                    <span>{formatNotificationTimeLabel(item.occurredAt)}</span>
                    <span>{item.actorUserSlug}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="size-3.5" />
                  <span>{item.recipientLabel}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-4">
            <AppEmptyState
              description={
                query.trim()
                  ? "No sent updates match the current search."
                  : "Sent admin messages and broadcasts will appear here."
              }
              kind={query.trim() ? "no-results" : "no-data"}
              title={
                query.trim() ? "No matching sent updates" : "No sent updates"
              }
            />
          </div>
        )}
      </AppTableWrapper>

      {totalCount > SENT_PAGE_SIZE ? (
        <AppPagination
          onPageChange={setPage}
          page={page}
          pageSize={SENT_PAGE_SIZE}
          totalCount={totalCount}
        />
      ) : null}
    </section>
  );
}
