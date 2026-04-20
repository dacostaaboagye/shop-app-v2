"use client";

import type { StockSupplyRequestResponse } from "@shop/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ClipboardList, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import {
  patchWorkerCancelSupplyRequest,
  workerSupplyRequestsQueryKey,
} from "@/lib/react-query/stock-supply";
import { cn } from "@/lib/utils";
import { workerStatusMeta } from "./worker-supply-requests.support";

export function WorkerSupplyRequestCard({
  item,
  onConfirmReceipt,
}: {
  item: StockSupplyRequestResponse;
  onConfirmReceipt: (item: StockSupplyRequestResponse) => void;
}) {
  const queryClient = useQueryClient();
  const canCancel = item.status === "pending" || item.status === "approved";
  const canConfirm = item.status === "dispatched";
  const { accent, icon: StatusIcon, label } = workerStatusMeta(item.status);
  const cancelMutation = useMutation({
    mutationFn: () => patchWorkerCancelSupplyRequest(item.supplyRequestId),
    onError(error) {
      toast.error(
        getAppErrorMessage(error, { fallbackDetail: "Failed to cancel." }),
      );
    },
    onSuccess() {
      toast.success("Supply request cancelled.");
      void queryClient.invalidateQueries({
        queryKey: workerSupplyRequestsQueryKey({}),
      });
    },
  });

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card shadow-sm",
        accent.border,
      )}
    >
      <div className={cn("absolute left-0 top-0 h-full w-1", accent.bar)} />
      <div className="flex flex-col gap-4 py-4 pl-5 pr-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                accent.icon,
              )}
            >
              <ClipboardList className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold leading-tight">
                {item.skuSnapshot.productName}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {item.skuSnapshot.variantName}
              </p>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                {item.reference}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
              accent.badge,
            )}
          >
            <StatusIcon className="size-3" />
            {label}
          </span>
        </div>

        <RequestRoute item={item} />
        <RequestQuantities item={item} />
        {item.resolutionNotes ? (
          <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs italic leading-relaxed text-muted-foreground">
            Manager: "{item.resolutionNotes}"
          </p>
        ) : null}

        {canConfirm || canCancel ? (
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            {canConfirm ? (
              <Button
                className="w-full gap-2"
                onClick={() => onConfirmReceipt(item)}
                size="lg"
              >
                <PackageCheck className="size-4" />
                Confirm receipt
              </Button>
            ) : null}
            {canCancel ? (
              <Button
                className="w-full text-muted-foreground hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
                size="lg"
                variant="outline"
              >
                {cancelMutation.isPending ? "Cancelling..." : "Cancel request"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function RequestRoute({ item }: { item: StockSupplyRequestResponse }) {
  return (
    <div className="flex flex-col gap-2 text-xs text-muted-foreground">
      {item.locationName ? (
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-foreground">To</span>
          <span>{item.locationName}</span>
        </div>
      ) : null}
      {item.sourceLocationName ? (
        <div className="flex items-center gap-1.5">
          <ArrowRight className="size-3 shrink-0" />
          <span>
            From{" "}
            <span className="font-medium text-foreground">
              {item.sourceLocationName}
            </span>
          </span>
        </div>
      ) : null}
      {item.gtnReference ? (
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">GTN:</span>
          <span className="font-mono font-medium text-foreground">
            {item.gtnReference}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function RequestQuantities({ item }: { item: StockSupplyRequestResponse }) {
  return (
    <dl className="grid grid-cols-2 divide-x divide-border rounded-lg border border-border bg-muted/30">
      <div className="px-4 py-2.5 text-center">
        <dt className="text-xs text-muted-foreground">Requested</dt>
        <dd className="mt-1 text-sm font-semibold tabular-nums">
          {item.requestedQuantity}
        </dd>
      </div>
      <div className="px-4 py-2.5 text-center">
        <dt className="text-xs text-muted-foreground">Approved</dt>
        <dd className="mt-1 text-sm font-semibold tabular-nums">
          {item.approvedQuantity ?? "-"}
        </dd>
      </div>
    </dl>
  );
}
