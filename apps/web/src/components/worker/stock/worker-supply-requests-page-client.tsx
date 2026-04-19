"use client";

import type { StockSupplyRequestResponse } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, ClipboardList, Clock, PackageCheck, XCircle } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import {
  fetchWorkerSupplyRequests,
  patchWorkerCancelSupplyRequest,
  patchWorkerConfirmReceipt,
  workerSupplyRequestsQueryKey,
} from "@/lib/react-query/stock-supply";

const SKELETON_KEYS = [1, 2, 3, 4, 5];
const QUERY = { page: 1, pageSize: 50 };

export function WorkerSupplyRequestsPageClient() {
  const [confirmTarget, setConfirmTarget] = useState<StockSupplyRequestResponse | null>(null);

  const requestsQuery = useQuery({
    queryFn: () => fetchWorkerSupplyRequests(QUERY),
    queryKey: workerSupplyRequestsQueryKey(QUERY),
    staleTime: 30_000,
  });

  const items = requestsQuery.data?.items ?? [];

  return (
    <PageShell>
      <PageHeader
        description="Track the status of your restocking requests."
        title="My supply requests"
      />

      {requestsQuery.isPending ? (
        <div className="flex flex-col gap-3">
          {SKELETON_KEYS.map((k) => (
            <Skeleton key={k} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : requestsQuery.isError ? (
        <AppErrorBanner
          detail="Could not load your supply requests."
          error={requestsQuery.error}
          onRetry={() => void requestsQuery.refetch()}
          title="Unable to load requests"
        />
      ) : (
        <SupplyRequestList items={items} onConfirmReceipt={setConfirmTarget} />
      )}

      <ConfirmReceiptDialog
        open={!!confirmTarget}
        target={confirmTarget}
        onOpenChange={(open) => { if (!open) setConfirmTarget(null); }}
        onSuccess={() => {
          void requestsQuery.refetch();
          setConfirmTarget(null);
        }}
      />
    </PageShell>
  );
}

function SupplyRequestList({
  items,
  onConfirmReceipt,
}: {
  items: StockSupplyRequestResponse[];
  onConfirmReceipt: (item: StockSupplyRequestResponse) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <ClipboardList className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-foreground">No requests yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit a supply request from your assignments page.
          </p>
        </div>
      </div>
    );
  }

  // Split active vs closed
  const active = items.filter((i) =>
    ["pending", "approved", "dispatched"].includes(i.status),
  );
  const closed = items.filter((i) =>
    ["received", "rejected", "cancelled"].includes(i.status),
  );

  return (
    <div className="flex flex-col gap-6">
      {active.length > 0 ? (
        <section className="flex flex-col gap-3">
          <p className="text-sm font-medium text-foreground">
            Active ({active.length})
          </p>
          <div className="flex flex-col gap-3">
            {active.map((item) => (
              <SupplyRequestCard
                key={item.id}
                item={item}
                onConfirmReceipt={onConfirmReceipt}
              />
            ))}
          </div>
        </section>
      ) : null}

      {closed.length > 0 ? (
        <section className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            History ({closed.length})
          </p>
          <div className="flex flex-col gap-3">
            {closed.map((item) => (
              <SupplyRequestCard
                key={item.id}
                item={item}
                onConfirmReceipt={onConfirmReceipt}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SupplyRequestCard({
  item,
  onConfirmReceipt,
}: {
  item: StockSupplyRequestResponse;
  onConfirmReceipt: (item: StockSupplyRequestResponse) => void;
}) {
  const queryClient = useQueryClient();
  const canCancel = item.status === "pending" || item.status === "approved";
  const canConfirm = item.status === "dispatched";

  const cancelMutation = useMutation({
    mutationFn: () => patchWorkerCancelSupplyRequest(item.id),
    onSuccess() {
      toast.success("Supply request cancelled.");
      void queryClient.invalidateQueries({ queryKey: workerSupplyRequestsQueryKey({}) });
    },
    onError(error) {
      toast.error(getAppErrorMessage(error, { fallbackDetail: "Failed to cancel." }));
    },
  });

  const { accent, icon: StatusIcon, label } = statusMeta(item.status);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card shadow-sm",
        accent.border,
      )}
    >
      <div className={cn("absolute left-0 top-0 h-full w-1", accent.bar)} />

      <div className="pl-5 pr-4 pt-4 pb-3 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", accent.icon)}>
              <ClipboardList className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold leading-tight">{item.skuSnapshot.productName}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{item.skuSnapshot.variantName}</p>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">{item.reference}</p>
            </div>
          </div>
          <span className={cn("shrink-0 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", accent.badge)}>
            <StatusIcon className="size-3" />
            {label}
          </span>
        </div>

        {/* Meta info */}
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          {item.sourceLocationName ? (
            <div className="flex items-center gap-1.5">
              <ArrowRight className="size-3 shrink-0" />
              <span>From <span className="font-medium text-foreground">{item.sourceLocationName}</span></span>
            </div>
          ) : null}
          {item.gtnReference ? (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">GTN:</span>
              <span className="font-mono font-medium text-foreground">{item.gtnReference}</span>
            </div>
          ) : null}
        </div>

        {/* Qty strip */}
        <div className="grid grid-cols-2 divide-x divide-border rounded-lg border border-border bg-muted/30">
          <div className="px-4 py-2.5 text-center">
            <p className="text-xs text-muted-foreground">Requested</p>
            <p className="mt-1 font-semibold tabular-nums">{item.requestedQuantity}</p>
          </div>
          <div className="px-4 py-2.5 text-center">
            <p className="text-xs text-muted-foreground">Approved</p>
            <p className="mt-1 font-semibold tabular-nums">
              {item.approvedQuantity ?? <span className="text-muted-foreground text-sm">—</span>}
            </p>
          </div>
        </div>

        {/* Notes */}
        {item.resolutionNotes ? (
          <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground italic">
            Manager: &ldquo;{item.resolutionNotes}&rdquo;
          </p>
        ) : null}

        {/* Actions */}
        {canConfirm ? (
          <Button
            className="w-full gap-2"
            onClick={() => onConfirmReceipt(item)}
          >
            <PackageCheck className="size-4" />
            Confirm receipt
          </Button>
        ) : null}
        {canCancel ? (
          <Button
            variant="ghost"
            className="w-full text-muted-foreground hover:text-destructive"
            disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
          >
            {cancelMutation.isPending ? "Cancelling…" : "Cancel request"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function statusMeta(status: string) {
  switch (status) {
    case "approved":
      return {
        accent: {
          bar: "bg-green-500",
          border: "border-green-200",
          icon: "bg-green-50 text-green-600",
          badge: "bg-green-50 text-green-700",
        },
        icon: CheckCircle2,
        label: "Approved",
      };
    case "dispatched":
      return {
        accent: {
          bar: "bg-blue-500",
          border: "border-blue-200",
          icon: "bg-blue-50 text-blue-600",
          badge: "bg-blue-50 text-blue-700",
        },
        icon: ArrowRight,
        label: "Dispatched",
      };
    case "received":
      return {
        accent: {
          bar: "bg-emerald-500",
          border: "border-emerald-200",
          icon: "bg-emerald-50 text-emerald-600",
          badge: "bg-emerald-50 text-emerald-700",
        },
        icon: PackageCheck,
        label: "Received",
      };
    case "rejected":
      return {
        accent: {
          bar: "bg-destructive",
          border: "border-destructive/30",
          icon: "bg-destructive/10 text-destructive",
          badge: "bg-destructive/10 text-destructive",
        },
        icon: XCircle,
        label: "Rejected",
      };
    case "cancelled":
      return {
        accent: {
          bar: "bg-muted-foreground/40",
          border: "border-border",
          icon: "bg-muted text-muted-foreground",
          badge: "bg-muted text-muted-foreground",
        },
        icon: XCircle,
        label: "Cancelled",
      };
    default:
      return {
        accent: {
          bar: "bg-amber-400",
          border: "border-amber-200",
          icon: "bg-amber-50 text-amber-600",
          badge: "bg-amber-50 text-amber-700",
        },
        icon: Clock,
        label: "Pending",
      };
  }
}

function ConfirmReceiptDialog({
  onOpenChange,
  onSuccess,
  open,
  target,
}: {
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  open: boolean;
  target: StockSupplyRequestResponse | null;
}) {
  const notesId = useId();
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) =>
      patchWorkerConfirmReceipt(id, {
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      }),
    onSuccess() {
      toast.success("Receipt confirmed. Stock updated.");
      void queryClient.invalidateQueries({ queryKey: ["supply-requests"] });
      setNotes("");
      onSuccess();
    },
    onError(error) {
      toast.error(getAppErrorMessage(error, { fallbackDetail: "Failed to confirm receipt." }));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    mutation.mutate(target.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirm receipt</DialogTitle>
          <DialogDescription>
            {target
              ? `${target.skuSnapshot.productName} — ${target.skuSnapshot.variantName} × ${target.approvedQuantity ?? target.requestedQuantity}`
              : null}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {target?.gtnReference ? (
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              GTN: <span className="font-mono font-medium text-foreground">{target.gtnReference}</span>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={notesId}>Notes (optional)</Label>
            <Textarea
              id={notesId}
              maxLength={500}
              placeholder="Any comments about the received goods…"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {mutation.isError ? (
            <p className="text-sm text-destructive">
              {getAppErrorMessage(mutation.error, { fallbackDetail: "Failed to confirm receipt." })}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} aria-disabled={mutation.isPending}>
              {mutation.isPending ? "Confirming…" : "Confirm receipt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
