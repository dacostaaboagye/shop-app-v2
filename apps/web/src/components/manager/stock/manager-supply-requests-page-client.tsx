"use client";

import type { StockSupplyRequestResponse } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import {
  fetchManagerIncomingSupplyRequests,
  managerIncomingSupplyRequestsQueryKey,
  patchManagerApproveSupplyRequest,
  patchManagerDispatch,
  patchManagerRejectSupplyRequest,
} from "@/lib/react-query/stock-supply";

const SKELETON_KEYS = [1, 2, 3, 4, 5];

type ResolveTarget = {
  action: "approve" | "reject" | "dispatch";
  item: StockSupplyRequestResponse;
};

export function ManagerSupplyRequestsPageClient() {
  const [resolveTarget, setResolveTarget] = useState<ResolveTarget | null>(null);

  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("stock.supply.manage");

  const query = {
    sourceLocationId: selectedLocationScope?.locationId ?? "",
    page: 1,
    pageSize: 50,
  };

  const requestsQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () =>
      fetchManagerIncomingSupplyRequests({
        sourceLocationId: selectedLocationScope!.locationId,
        page: 1,
        pageSize: 50,
      }),
    queryKey: managerIncomingSupplyRequestsQueryKey(query),
    staleTime: 30_000,
  });

  const items = requestsQuery.data?.items ?? [];
  const pending = items.filter((i) => i.status === "pending");
  const approved = items.filter((i) => i.status === "approved");
  const dispatched = items.filter((i) => i.status === "dispatched");
  const history = items.filter((i) =>
    ["received", "rejected", "cancelled"].includes(i.status),
  );

  return (
    <PageShell>
      <PageHeader
        description="Review and action stock supply requests directed to this location."
        title="Incoming supply requests"
      />

      <LocationScopePanel
        description="Supply requests show for the location you manage as a source."
        emptyDescription="No location is available for supply request management."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Location"
      />

      {requestsQuery.isPending && selectedLocationScope ? (
        <div className="flex flex-col gap-2">
          {SKELETON_KEYS.map((k) => (
            <Skeleton key={k} className="h-16 w-full" />
          ))}
        </div>
      ) : requestsQuery.isError ? (
        <AppErrorBanner
          detail="Could not load supply requests."
          error={requestsQuery.error}
          onRetry={() => void requestsQuery.refetch()}
          title="Unable to load requests"
        />
      ) : selectedLocationScope ? (
        <div className="flex flex-col gap-6">
          {pending.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">Pending ({pending.length})</h2>
              <div className="divide-y divide-border rounded-md border border-border bg-card">
                {pending.map((item) => (
                  <SupplyRequestRow
                    key={item.id}
                    item={item}
                    onAction={(action) => setResolveTarget({ action, item })}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {approved.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">Approved — awaiting dispatch ({approved.length})</h2>
              <div className="divide-y divide-border rounded-md border border-border bg-card">
                {approved.map((item) => (
                  <SupplyRequestRow
                    key={item.id}
                    item={item}
                    onAction={(action) => setResolveTarget({ action, item })}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {dispatched.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                In transit ({dispatched.length})
              </h2>
              <div className="divide-y divide-border rounded-md border border-border bg-card">
                {dispatched.map((item) => (
                  <SupplyRequestRow key={item.id} item={item} />
                ))}
              </div>
            </section>
          ) : null}

          {history.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                History ({history.length})
              </h2>
              <div className="divide-y divide-border rounded-md border border-border bg-card">
                {history.map((item) => (
                  <SupplyRequestRow key={item.id} item={item} />
                ))}
              </div>
            </section>
          ) : null}

          {items.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No supply requests for this location yet.
            </div>
          ) : null}
        </div>
      ) : null}

      <ActionDialog
        open={!!resolveTarget}
        target={resolveTarget}
        onOpenChange={(open) => {
          if (!open) setResolveTarget(null);
        }}
        onSuccess={() => {
          void requestsQuery.refetch();
          setResolveTarget(null);
        }}
      />
    </PageShell>
  );
}

function SupplyRequestRow({
  item,
  onAction,
}: {
  item: StockSupplyRequestResponse;
  onAction?: (action: "approve" | "reject" | "dispatch") => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <ClipboardList className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="font-medium leading-none">{item.skuSnapshot.productName}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {item.skuSnapshot.variantName}
          </p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {item.reference}
          </p>
          {item.requesterName ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {item.requesterName}
              {item.requesterEmail ? ` · ${item.requesterEmail}` : ""}
            </p>
          ) : null}
          {item.locationName ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              To: {item.locationName}
            </p>
          ) : null}
          {item.gtnReference ? (
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              GTN: {item.gtnReference}
            </p>
          ) : null}
          {item.notes ? (
            <p className="mt-1 text-xs text-muted-foreground italic">
              &ldquo;{item.notes}&rdquo;
            </p>
          ) : null}
          {item.resolutionNotes ? (
            <p className="mt-1 text-xs text-muted-foreground italic">
              Note: &ldquo;{item.resolutionNotes}&rdquo;
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Requested</p>
          <p className="font-medium tabular-nums">{item.requestedQuantity}</p>
        </div>
        {item.approvedQuantity != null ? (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Approved</p>
            <p className="font-medium tabular-nums">{item.approvedQuantity}</p>
          </div>
        ) : null}
        <StatusBadge status={item.status} />
        {item.status === "pending" && onAction ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-50"
              onClick={() => onAction("approve")}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/5"
              onClick={() => onAction("reject")}
            >
              Reject
            </Button>
          </>
        ) : null}
        {item.status === "approved" && onAction ? (
          <Button
            size="sm"
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
            onClick={() => onAction("dispatch")}
          >
            Dispatch
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ActionDialog({
  onOpenChange,
  onSuccess,
  open,
  target,
}: {
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  open: boolean;
  target: ResolveTarget | null;
}) {
  const notesId = useId();
  const approvedQtyId = useId();
  const [notes, setNotes] = useState("");
  const [approvedQty, setApprovedQty] = useState("");
  const queryClient = useQueryClient();

  function resetAndClose() {
    setNotes("");
    setApprovedQty("");
    onOpenChange(false);
  }

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      patchManagerApproveSupplyRequest(id, {
        approvedQuantity: parseInt(approvedQty, 10),
        ...(notes.trim() ? { resolutionNotes: notes.trim() } : {}),
      }),
    onSuccess() {
      toast.success("Supply request approved.");
      void queryClient.invalidateQueries({ queryKey: ["supply-requests"] });
      resetAndClose();
      onSuccess();
    },
    onError(error) {
      toast.error(getAppErrorMessage(error, { fallbackDetail: "Failed to approve request." }));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      patchManagerRejectSupplyRequest(id, {
        ...(notes.trim() ? { resolutionNotes: notes.trim() } : {}),
      }),
    onSuccess() {
      toast.success("Supply request rejected.");
      void queryClient.invalidateQueries({ queryKey: ["supply-requests"] });
      resetAndClose();
      onSuccess();
    },
    onError(error) {
      toast.error(getAppErrorMessage(error, { fallbackDetail: "Failed to reject request." }));
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: (id: string) =>
      patchManagerDispatch(id, {
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      }),
    onSuccess() {
      toast.success("Goods dispatched. GTN created.");
      void queryClient.invalidateQueries({ queryKey: ["supply-requests"] });
      resetAndClose();
      onSuccess();
    },
    onError(error) {
      toast.error(getAppErrorMessage(error, { fallbackDetail: "Failed to dispatch." }));
    },
  });

  const action = target?.action;
  const isPending =
    approveMutation.isPending || rejectMutation.isPending || dispatchMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    if (action === "approve") {
      const qty = parseInt(approvedQty, 10);
      if (!Number.isInteger(qty) || qty < 1) return;
      approveMutation.mutate(target.item.id);
    } else if (action === "reject") {
      rejectMutation.mutate(target.item.id);
    } else if (action === "dispatch") {
      dispatchMutation.mutate(target.item.id);
    }
  }

  const title =
    action === "approve"
      ? "Approve request"
      : action === "dispatch"
        ? "Dispatch goods"
        : "Reject request";

  const submitLabel =
    action === "approve"
      ? "Approve"
      : action === "dispatch"
        ? "Dispatch"
        : "Reject";

  const submitVariant =
    action === "reject" ? "destructive" : "default";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {target?.item.skuSnapshot.productName} —{" "}
            {target?.item.skuSnapshot.variantName} &times;{" "}
            {target?.item.requestedQuantity}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {action === "approve" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={approvedQtyId}>Quantity you can send</Label>
              <Input
                id={approvedQtyId}
                inputMode="numeric"
                min={1}
                required
                type="number"
                value={approvedQty}
                onChange={(e) => setApprovedQty(e.target.value)}
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={notesId}>
              {action === "dispatch" ? "Dispatch notes (optional)" : "Note to worker (optional)"}
            </Label>
            <Textarea
              id={notesId}
              maxLength={500}
              placeholder={
                action === "dispatch"
                  ? "Any notes about this shipment…"
                  : "Reason or additional context…"
              }
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {approveMutation.isError || rejectMutation.isError || dispatchMutation.isError ? (
            <p className="text-sm text-destructive">
              {getAppErrorMessage(
                approveMutation.error ?? rejectMutation.error ?? dispatchMutation.error,
                { fallbackDetail: "Something went wrong." },
              )}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={submitVariant}
              disabled={isPending || (action === "approve" && !approvedQty)}
              aria-disabled={isPending}
            >
              {isPending ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>
    );
  }
  if (status === "dispatched") {
    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Dispatched</Badge>
    );
  }
  if (status === "received") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Received</Badge>
    );
  }
  if (status === "rejected") {
    return <Badge variant="destructive">Rejected</Badge>;
  }
  if (status === "cancelled") {
    return (
      <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>
    );
  }
  return <Badge variant="secondary">Pending</Badge>;
}
