"use client";

import type { StockSupplyRequestResponse } from "@shop/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  buildConfirmReceiptPayload,
  createTransferReceiptDefaults,
  getExpectedTransferQuantity,
  getReceiptFormError,
  type TransferReceiptFormValues,
} from "@/components/stock/transfer-receipt.support";
import { TransferReceiptFields } from "@/components/stock/transfer-receipt-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import { patchWorkerConfirmReceipt } from "@/lib/react-query/stock-supply";

export function ConfirmReceiptDialog({
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
  const [values, setValues] = useState<TransferReceiptFormValues>(() =>
    createTransferReceiptDefaults(target),
  );
  const queryClient = useQueryClient();
  const expectedQuantity = target ? getExpectedTransferQuantity(target) : 0;
  const formError = target
    ? getReceiptFormError(values, expectedQuantity)
    : null;

  useEffect(() => {
    if (open) {
      setValues(createTransferReceiptDefaults(target));
    }
  }, [open, target]);

  const mutation = useMutation({
    mutationFn: (id: string) =>
      patchWorkerConfirmReceipt(
        id,
        buildConfirmReceiptPayload(values, expectedQuantity),
      ),
    onError(error) {
      toast.error(
        getAppErrorMessage(error, {
          fallbackDetail: "Failed to confirm receipt.",
        }),
      );
    },
    onSuccess() {
      toast.success("Receipt confirmed. Stock updated.");
      void queryClient.invalidateQueries({ queryKey: ["supply-requests"] });
      setValues(createTransferReceiptDefaults(null));
      onSuccess();
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (target && !formError) mutation.mutate(target.supplyRequestId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Confirm receipt</DialogTitle>
          <DialogDescription>
            {target ? getDialogDescription(target) : null}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <TransferRoute target={target} />
            <GtnReference target={target} />
          </div>
          {target ? (
            <TransferReceiptFields
              disabled={mutation.isPending}
              expectedQuantity={expectedQuantity}
              onChange={setValues}
              values={values}
            />
          ) : null}
          {mutation.isError ? (
            <p className="text-sm text-destructive">
              {getAppErrorMessage(mutation.error, {
                fallbackDetail: "Failed to confirm receipt.",
              })}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              aria-disabled={mutation.isPending}
              disabled={mutation.isPending || !!formError}
              type="submit"
            >
              {mutation.isPending ? "Confirming..." : "Confirm receipt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TransferRoute({
  target,
}: {
  target: StockSupplyRequestResponse | null;
}) {
  if (!target?.sourceLocationName && !target?.locationName) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
      <span className="type-kicker block text-muted-foreground">Route</span>
      <span className="font-medium text-foreground">
        {target.sourceLocationName ?? "Source location"}
        {" -> "}
        {target.locationName ?? "Destination location"}
      </span>
    </div>
  );
}

function GtnReference({
  target,
}: {
  target: StockSupplyRequestResponse | null;
}) {
  if (!target?.gtnReference) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
      <span className="type-kicker block text-muted-foreground">GTN</span>
      <span className="font-mono font-medium text-foreground">
        {target.gtnReference}
      </span>
    </div>
  );
}

function getDialogDescription(target: StockSupplyRequestResponse) {
  const quantity = target.approvedQuantity ?? target.requestedQuantity;
  return `${target.skuSnapshot.productName} - ${target.skuSnapshot.variantName} x ${quantity}`;
}
