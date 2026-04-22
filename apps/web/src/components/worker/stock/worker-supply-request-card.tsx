"use client";

import type { StockSupplyRequestResponse } from "@shop/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { SupplyRequestSummaryCard } from "@/components/stock/supply-request-summary-card";
import { Button } from "@/components/ui/button";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import {
  patchWorkerCancelSupplyRequest,
  workerSupplyRequestsQueryKey,
} from "@/lib/react-query/stock-supply";
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
    <SupplyRequestSummaryCard
      actions={
        canConfirm || canCancel ? (
          <WorkerActions
            canCancel={canCancel}
            canConfirm={canConfirm}
            cancelPending={cancelMutation.isPending}
            item={item}
            onCancel={() => cancelMutation.mutate()}
            onConfirmReceipt={onConfirmReceipt}
          />
        ) : undefined
      }
      item={item}
      requesterLabel="Requester"
      requesterValue="You"
      status={workerStatusMeta(item.status)}
    />
  );
}

function WorkerActions({
  canCancel,
  canConfirm,
  cancelPending,
  item,
  onCancel,
  onConfirmReceipt,
}: {
  canCancel: boolean;
  canConfirm: boolean;
  cancelPending: boolean;
  item: StockSupplyRequestResponse;
  onCancel: () => void;
  onConfirmReceipt: (item: StockSupplyRequestResponse) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
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
          disabled={cancelPending}
          onClick={onCancel}
          size="lg"
          variant="outline"
        >
          {cancelPending ? "Cancelling..." : "Cancel request"}
        </Button>
      ) : null}
    </div>
  );
}
