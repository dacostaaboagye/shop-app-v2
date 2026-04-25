"use client";

import type {
  CancelStockSupplyRequest,
  ConfirmReceipt,
  StockSupplyRequestResponse,
} from "@shop/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useId, useState } from "react";
import { toast } from "sonner";
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
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();
  const overrideReasonId = useId();
  const notesId = useId();

  function resetAndClose() {
    setNotes("");
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
        adminOverrideReason: overrideReason.trim(),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
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
    if (target && overrideReason.trim()) {
      mutation.mutate(target);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={notesId}>Receipt notes (optional)</Label>
              <Textarea
                id={notesId}
                maxLength={500}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Any operational notes about the received goods."
                rows={3}
                value={notes}
              />
            </div>
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
              disabled={mutation.isPending || overrideReason.trim() === ""}
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
