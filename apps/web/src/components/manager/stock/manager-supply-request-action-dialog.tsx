"use client";

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
import { getAppErrorMessage } from "@/lib/errors/app-error";
import {
  patchManagerApproveSupplyRequest,
  patchManagerDispatch,
  patchManagerRejectSupplyRequest,
} from "@/lib/react-query/stock-supply";
import {
  ApprovedQuantityField,
  getActionTitle,
  getSubmitLabel,
  isValidApprovedQuantity,
  MutationErrorMessage,
  NotesField,
} from "./manager-supply-request-action-dialog.parts";
import type { ResolveTarget } from "./manager-supply-requests.support";

export function ActionDialog({
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
  const [approvedQty, setApprovedQty] = useState("");
  const [notes, setNotes] = useState("");
  const approvedQtyId = useId();
  const notesId = useId();
  const queryClient = useQueryClient();

  function resetAndClose() {
    setApprovedQty("");
    setNotes("");
    onOpenChange(false);
  }

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      patchManagerApproveSupplyRequest(id, {
        approvedQuantity: parseInt(approvedQty, 10),
        ...(notes.trim() ? { resolutionNotes: notes.trim() } : {}),
      }),
    onError(error) {
      toast.error(
        getAppErrorMessage(error, {
          fallbackDetail: "Failed to approve request.",
        }),
      );
    },
    onSuccess() {
      toast.success("Supply request approved.");
      invalidateSupplyRequests(queryClient);
      resetAndClose();
      onSuccess();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      patchManagerRejectSupplyRequest(id, {
        ...(notes.trim() ? { resolutionNotes: notes.trim() } : {}),
      }),
    onError(error) {
      toast.error(
        getAppErrorMessage(error, {
          fallbackDetail: "Failed to reject request.",
        }),
      );
    },
    onSuccess() {
      toast.success("Supply request rejected.");
      invalidateSupplyRequests(queryClient);
      resetAndClose();
      onSuccess();
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: (id: string) =>
      patchManagerDispatch(id, {
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      }),
    onError(error) {
      toast.error(
        getAppErrorMessage(error, { fallbackDetail: "Failed to dispatch." }),
      );
    },
    onSuccess() {
      toast.success("Goods dispatched. GTN created.");
      invalidateSupplyRequests(queryClient);
      resetAndClose();
      onSuccess();
    },
  });

  const action = target?.action;
  const isPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    dispatchMutation.isPending;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!target) return;
    if (action === "approve" && isValidApprovedQuantity(approvedQty)) {
      approveMutation.mutate(target.item.supplyRequestId);
    }
    if (action === "reject") rejectMutation.mutate(target.item.supplyRequestId);
    if (action === "dispatch")
      dispatchMutation.mutate(target.item.supplyRequestId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{getActionTitle(action)}</DialogTitle>
          <DialogDescription>
            {target?.item.skuSnapshot.productName} -{" "}
            {target?.item.skuSnapshot.variantName} x{" "}
            {target?.item.requestedQuantity}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {action === "approve" ? (
            <ApprovedQuantityField
              approvedQty={approvedQty}
              approvedQtyId={approvedQtyId}
              setApprovedQty={setApprovedQty}
            />
          ) : null}
          <NotesField
            action={action}
            notes={notes}
            notesId={notesId}
            setNotes={setNotes}
          />
          <MutationErrorMessage
            error={
              approveMutation.error ??
              rejectMutation.error ??
              dispatchMutation.error
            }
          />
          <DialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              aria-disabled={isPending}
              disabled={isPending || (action === "approve" && !approvedQty)}
              type="submit"
              variant={action === "reject" ? "destructive" : "default"}
            >
              {isPending ? "Saving..." : getSubmitLabel(action)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function invalidateSupplyRequests(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: ["supply-requests"] });
}
