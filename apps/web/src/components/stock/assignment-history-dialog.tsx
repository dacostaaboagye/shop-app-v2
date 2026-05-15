"use client";

import type { AssignmentHistoryEvent } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, History } from "lucide-react";
import Link from "next/link";
import { AppErrorBanner } from "@/components/system/app-error";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount, formatDateTime } from "@/lib/display/format";
import {
  assignmentHistoryQueryKey,
  fetchAssignmentHistory,
} from "@/lib/react-query/worker-assignments";
import {
  buildManagerStockMovementHref,
  formatAssignmentHistoryEventLabel,
} from "./assignment-history-dialog.support";

export type AssignmentHistoryTarget = {
  locationId: string;
  locationSlug?: string;
  productName: string;
  sku: string;
  skuId: string;
  variantName: string;
};

export function AssignmentHistoryDialog({
  onOpenChange,
  open,
  scope,
  target,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  scope: "manager" | "worker";
  target: AssignmentHistoryTarget | null;
}) {
  const historyQuery = useQuery({
    enabled: open && !!target,
    queryFn: () => {
      if (!target) throw new Error("Assignment history target is required.");
      return fetchAssignmentHistory({
        locationId: target.locationId,
        scope,
        skuId: target.skuId,
      });
    },
    queryKey: assignmentHistoryQueryKey(
      scope,
      target?.locationId ?? "",
      target?.skuId ?? "",
    ),
    staleTime: 30_000,
  });
  const movementHref =
    scope === "manager" && historyQuery.data
      ? buildManagerStockMovementHref({
          locationSlug: historyQuery.data.locationSlug,
          sku: historyQuery.data.sku,
        })
      : null;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[88vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            Assignment history
          </DialogTitle>
          <DialogDescription>
            {target
              ? `${target.productName} - ${target.variantName} (${target.sku})`
              : "Stock ownership timeline"}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto pr-1">
          {historyQuery.isPending ? (
            <HistorySkeleton />
          ) : historyQuery.isError ? (
            <AppErrorBanner
              detail="Could not load assignment history for this stock item."
              error={historyQuery.error}
              onRetry={() => void historyQuery.refetch()}
              title="Unable to load history"
            />
          ) : (
            <div className="flex flex-col gap-4">
              <HistorySummary
                count={historyQuery.data.items.length}
                locationName={historyQuery.data.locationName}
              />
              <div className="flex flex-col gap-3">
                {historyQuery.data.items.map((item, index) => (
                  <HistoryEventRow
                    event={item}
                    isLast={index === historyQuery.data.items.length - 1}
                    key={`${item.eventType}-${item.createdAt}-${item.workerSlug}-${item.handoverChainId ?? "direct"}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {movementHref ? (
          <DialogFooter>
            <Link
              className={buttonVariants({ variant: "outline" })}
              href={movementHref}
            >
              <ExternalLink className="size-4" data-icon="inline-start" />
              Stock movements
            </Link>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function HistorySummary({
  count,
  locationName,
}: {
  count: number;
  locationName: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <p className="type-data-value">{locationName}</p>
      <p className="type-support">
        {formatCount(count)} ownership event{count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function HistoryEventRow({
  event,
  isLast,
}: {
  event: AssignmentHistoryEvent;
  isLast: boolean;
}) {
  return (
    <div className="grid grid-cols-[20px_1fr] gap-3">
      <div className="flex flex-col items-center">
        <span className="mt-1 size-2.5 rounded-full bg-primary" />
        {!isLast ? <span className="min-h-12 w-px flex-1 bg-border" /> : null}
      </div>
      <div className="rounded-lg border border-border/60 bg-card p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="type-data-value">
              {formatAssignmentHistoryEventLabel(event.eventType)}
            </p>
            <p className="type-support">
              {event.workerName} by {event.actorName}
            </p>
          </div>
          <Badge className="rounded-md" variant="secondary">
            Qty {formatCount(event.quantity)}
          </Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>{formatDateTime(event.effectiveFrom)}</span>
          {event.handoverChainId ? (
            <span className="font-mono">
              {event.handoverChainId.slice(0, 8)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}
