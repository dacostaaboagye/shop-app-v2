"use client";

import type { FormEvent } from "react";
import { useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import {
  patchManagerApproveSupplyRequest,
  patchManagerDispatch,
  patchManagerRejectSupplyRequest,
} from "@/lib/react-query/stock-supply";
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
      toast.error(getAppErrorMessage(error, { fallbackDetail: "Failed to approve request." }));
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
      toast.error(getAppErrorMessage(error, { fallbackDetail: "Failed to reject request." }));
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
      toast.error(getAppErrorMessage(error, { fallbackDetail: "Failed to dispatch." }));
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
    if (action === "dispatch") dispatchMutation.mutate(target.item.supplyRequestId);
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
            <Button onClick={() => onOpenChange(false)} type="button" variant="ghost">
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

function ApprovedQuantityField({
  approvedQty,
  approvedQtyId,
  setApprovedQty,
}: {
  approvedQty: string;
  approvedQtyId: string;
  setApprovedQty: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={approvedQtyId}>Quantity you can send</Label>
      <Input
        id={approvedQtyId}
        inputMode="numeric"
        min={1}
        onChange={(event) => setApprovedQty(event.target.value)}
        required
        type="number"
        value={approvedQty}
      />
    </div>
  );
}

function NotesField({
  action,
  notes,
  notesId,
  setNotes,
}: {
  action: ResolveTarget["action"] | undefined;
  notes: string;
  notesId: string;
  setNotes: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={notesId}>
        {action === "dispatch" ? "Dispatch notes (optional)" : "Note to worker (optional)"}
      </Label>
      <Textarea
        id={notesId}
        maxLength={500}
        onChange={(event) => setNotes(event.target.value)}
        placeholder={action === "dispatch" ? "Any notes about this shipment..." : "Reason or additional context..."}
        rows={3}
        value={notes}
      />
    </div>
  );
}

function MutationErrorMessage({ error }: { error: Error | null }) {
  if (!error) return null;
  return (
    <p className="text-sm text-destructive">
      {getAppErrorMessage(error, { fallbackDetail: "Something went wrong." })}
    </p>
  );
}

function isValidApprovedQuantity(value: string) {
  const quantity = parseInt(value, 10);
  return Number.isInteger(quantity) && quantity > 0;
}

function getActionTitle(action: ResolveTarget["action"] | undefined) {
  if (action === "approve") return "Approve request";
  if (action === "dispatch") return "Dispatch goods";
  return "Reject request";
}

function getSubmitLabel(action: ResolveTarget["action"] | undefined) {
  if (action === "approve") return "Approve";
  if (action === "dispatch") return "Dispatch";
  return "Reject";
}

function invalidateSupplyRequests(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["supply-requests"] });
}
