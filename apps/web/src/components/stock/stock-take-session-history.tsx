"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  cancelStockTakeSession,
  fetchStockTakeSessions,
  type StockTakePortal,
  type StockTakeSessionListResponse,
  type StockTakeStatus,
  stockTakeSessionsQueryKey,
} from "@/lib/react-query/stock-takes";
import { toRoute } from "@/lib/routes";
import { useStockTakeDownloads } from "./stock-take-downloads";
import { StockTakeSessionActions } from "./stock-take-session-actions";

type StockTakeSessionHistoryProps = {
  locationSlug?: string;
  portal: StockTakePortal;
};

export function StockTakeSessionHistory({
  locationSlug,
  portal,
}: StockTakeSessionHistoryProps) {
  const queryClient = useQueryClient();
  const { workbookMutation } = useStockTakeDownloads(portal);
  const query = { locationSlug, page: 1, pageSize: 25 };
  const enabled = portal === "admin" || Boolean(locationSlug);
  const sessionsQuery = useQuery({
    enabled,
    queryFn: () => fetchStockTakeSessions(portal, query),
    queryKey: stockTakeSessionsQueryKey(portal, query),
  });
  const cancelMutation = useMutation({
    mutationFn: (reference: string) =>
      cancelStockTakeSession(portal, reference),
    onSuccess: async () => {
      toast.success("Stock-take session deleted.");
      await queryClient.invalidateQueries({ queryKey: ["stock-takes"] });
    },
  });

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4 text-primary" />
          Previous stock-take sessions
        </CardTitle>
        <CardDescription>
          Continue generated counts, review imports, and access applied
          stock-take evidence.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!enabled ? (
          <AppEmptyState
            description="Choose a managed location to see its stock-taking history."
            title="No location selected"
          />
        ) : sessionsQuery.isPending ? (
          <HistorySkeleton />
        ) : sessionsQuery.isError ? (
          <AppErrorBanner
            detail="Stock-take sessions could not be loaded. Retry after confirming your location access."
            error={sessionsQuery.error}
            onRetry={() => void sessionsQuery.refetch()}
            title="Unable to load stock-take history"
          />
        ) : (
          <StockTakeSessionHistoryList
            deletingReference={cancelMutation.variables ?? null}
            deleteError={cancelMutation.error}
            downloadingReference={workbookMutation.variables ?? null}
            downloadError={workbookMutation.error}
            onDelete={(reference) => cancelMutation.mutate(reference)}
            onDownloadWorkbook={(reference) =>
              workbookMutation.mutate(reference)
            }
            portal={portal}
            response={sessionsQuery.data}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function StockTakeSessionHistoryList({
  deletingReference = null,
  deleteError = null,
  downloadingReference = null,
  downloadError = null,
  onDelete,
  onDownloadWorkbook,
  portal,
  response,
}: {
  deletingReference?: string | null;
  deleteError?: unknown;
  downloadingReference?: string | null;
  downloadError?: unknown;
  onDelete?: (reference: string) => void;
  onDownloadWorkbook?: (reference: string) => void;
  portal: StockTakePortal;
  response: StockTakeSessionListResponse;
}) {
  if (response.items.length === 0) {
    return (
      <AppEmptyState
        description="Generated stock-take sessions will appear here for review, printing, and audit evidence."
        title="No stock-take sessions yet"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {deleteError ? (
        <AppErrorBanner
          detail="The session could not be deleted. Applied or already cancelled sessions are retained as audit evidence."
          error={deleteError}
          title="Unable to delete stock-take session"
        />
      ) : null}
      {downloadError ? (
        <AppErrorBanner
          detail="The workbook could not be downloaded. Retry from this session or open the review page."
          error={downloadError}
          title="Unable to download workbook"
        />
      ) : null}
      <p className="type-support text-muted-foreground">
        Showing {response.items.length} of {response.totalCount} session(s).
      </p>
      {response.items.map((session) => (
        <article
          className="rounded-xl border border-border/60 bg-card/70 p-4 shadow-xs"
          key={session.stockTakeReference}
        >
          <div className="flex flex-col gap-4">
            <div className="min-w-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Link
                    className="font-mono text-sm font-semibold text-foreground underline-offset-4 hover:underline"
                    href={toRoute(
                      `/${portal}/stock/takes/${session.stockTakeReference}`,
                    )}
                  >
                    {session.stockTakeReference}
                  </Link>
                  <Badge variant={statusVariant(session.status)}>
                    {formatStatus(session.status)}
                  </Badge>
                  <Badge variant="outline">{formatMode(session.mode)}</Badge>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {session.locationName}
                </p>
              </div>
              <p className="type-support mt-2 text-muted-foreground">
                {session.lineCount} line(s) - Generated{" "}
                {formatDateTime(session.generatedAt)}
                {session.generatedByUserSlug
                  ? ` by ${session.generatedByUserSlug}`
                  : ""}
              </p>
            </div>
            <StockTakeSessionActions
              deletingReference={deletingReference}
              downloadingReference={downloadingReference}
              {...(onDelete ? { onDelete } : {})}
              {...(onDownloadWorkbook ? { onDownloadWorkbook } : {})}
              portal={portal}
              session={session}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
    </div>
  );
}

function statusVariant(status: StockTakeStatus) {
  if (status === "applied") return "default";
  if (status === "cancelled") return "destructive";
  if (status === "reviewed") return "secondary";
  return "outline";
}

function formatStatus(status: StockTakeStatus) {
  return status.replaceAll("_", " ");
}

function formatMode(mode: "blind" | "assisted") {
  return mode === "blind" ? "Blind count" : "Assisted count";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
