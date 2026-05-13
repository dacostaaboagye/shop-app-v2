"use client";

import type {
  CancelStockSupplyRequest,
  ConfirmReceipt,
  StockSupplyRequestResponse,
} from "@shop/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useEffect, useId, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import {
  patchWorkerCancelSupplyRequest,
  patchWorkerConfirmReceipt,
} from "@/lib/react-query/stock-supply";
import type { AdminTransferOverrideAction } from "./admin-transfer-actions";

type OverrideTarget = {
  action: AdminTransferOverrideAction;
  item: StockSupplyRequestResponse;
};

export function AdminTransferOverrideDialog({
  onOpenChange,
  onSuccess,
  open,
  target,
}: {
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  open: boolean;
  target: OverrideTarget | null;
}) {
  const [overrideReason, setOverrideReason] = useState("");
  const [receiptValues, setReceiptValues] = useState<TransferReceiptFormValues>(
    () => createTransferReceiptDefaults(target?.item ?? null),
  );
  const queryClient = useQueryClient();
  const overrideReasonId = useId();
  const expectedQuantity = target
    ? getExpectedTransferQuantity(target.item)
    : 0;
  const receiptError =
    target?.action === "confirm_receipt"
      ? getReceiptFormError(receiptValues, expectedQuantity)
      : null;

  useEffect(() => {
    if (open) {
      setReceiptValues(createTransferReceiptDefaults(target?.item ?? null));
      setOverrideReason("");
    }
  }, [open, target]);

  function resetAndClose() {
    setReceiptValues(createTransferReceiptDefaults(null));
    setOverrideReason("");
    onOpenChange(false);
  }

  const mutation = useMutation({
    mutationFn: async (currentTarget: OverrideTarget) => {
      if (currentTarget.action === "cancel") {
        const body: CancelStockSupplyRequest = {
          adminOverrideReason: overrideReason.trim(),
        };
        return patchWorkerCancelSupplyRequest(
          currentTarget.item.supplyRequestId,
          body,
        );
      }

      const body: ConfirmReceipt = {
        ...buildConfirmReceiptPayload(receiptValues, expectedQuantity),
        adminOverrideReason: overrideReason.trim(),
      };
      return patchWorkerConfirmReceipt(
        currentTarget.item.supplyRequestId,
        body,
      );
    },
    onError(error) {
      toast.error(
        getAppErrorMessage(error, {
          fallbackDetail: "Failed to apply admin override.",
        }),
      );
    },
    onSuccess(_, currentTarget) {
      toast.success(
        currentTarget.action === "cancel"
          ? "Transfer cancelled through admin override."
          : "Receipt confirmed through admin override.",
      );
      void queryClient.invalidateQueries({ queryKey: ["supply-requests"] });
      resetAndClose();
      onSuccess();
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (target && overrideReason.trim() && !receiptError) {
      mutation.mutate(target);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{getTitle(target?.action)}</DialogTitle>
          <DialogDescription>
            {target
              ? `${target.item.skuSnapshot.productName} - ${target.item.skuSnapshot.variantName} x ${target.item.approvedQuantity ?? target.item.requestedQuantity}`
              : null}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={overrideReasonId}>Override reason</Label>
            <Textarea
              id={overrideReasonId}
              maxLength={500}
              onChange={(event) => setOverrideReason(event.target.value)}
              placeholder="Explain why admin intervention is required."
              rows={4}
              value={overrideReason}
            />
          </div>
          {target?.action === "confirm_receipt" ? (
            <TransferReceiptFields
              disabled={mutation.isPending}
              expectedQuantity={expectedQuantity}
              onChange={setReceiptValues}
              values={receiptValues}
            />
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
              disabled={
                mutation.isPending ||
                overrideReason.trim() === "" ||
                !!receiptError
              }
              type="submit"
            >
              {mutation.isPending
                ? "Saving..."
                : getSubmitLabel(target?.action)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getTitle(action: AdminTransferOverrideAction | undefined) {
  if (action === "confirm_receipt") {
    return "Confirm receipt by admin override";
  }
  return "Cancel transfer by admin override";
}

function getSubmitLabel(action: AdminTransferOverrideAction | undefined) {
  if (action === "confirm_receipt") {
    return "Confirm receipt";
  }
  return "Cancel transfer";
}
