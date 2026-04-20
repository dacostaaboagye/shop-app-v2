"use client";

import type { FormEvent } from "react";
import type { StockSupplyRequestResponse } from "@shop/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  const [notes, setNotes] = useState("");
  const notesId = useId();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (id: string) =>
      patchWorkerConfirmReceipt(id, {
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      }),
    onError(error) {
      toast.error(getAppErrorMessage(error, { fallbackDetail: "Failed to confirm receipt." }));
    },
    onSuccess() {
      toast.success("Receipt confirmed. Stock updated.");
      void queryClient.invalidateQueries({ queryKey: ["supply-requests"] });
      setNotes("");
      onSuccess();
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (target) mutation.mutate(target.supplyRequestId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirm receipt</DialogTitle>
          <DialogDescription>{target ? getDialogDescription(target) : null}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <TransferRoute target={target} />
          <GtnReference target={target} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={notesId}>Notes (optional)</Label>
            <Textarea
              id={notesId}
              maxLength={500}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Any comments about the received goods..."
              rows={3}
              value={notes}
            />
          </div>
          {mutation.isError ? (
            <p className="text-sm text-destructive">
              {getAppErrorMessage(mutation.error, {
                fallbackDetail: "Failed to confirm receipt.",
              })}
            </p>
          ) : null}
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button
              aria-disabled={mutation.isPending}
              disabled={mutation.isPending}
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

function TransferRoute({ target }: { target: StockSupplyRequestResponse | null }) {
  if (!target?.sourceLocationName && !target?.locationName) return null;
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Transfer route:</span>{" "}
      {target.sourceLocationName ?? "Source location"}
      {" -> "}
      {target.locationName ?? "Destination location"}
    </div>
  );
}

function GtnReference({ target }: { target: StockSupplyRequestResponse | null }) {
  if (!target?.gtnReference) return null;
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      GTN: <span className="font-mono font-medium text-foreground">{target.gtnReference}</span>
    </div>
  );
}

function getDialogDescription(target: StockSupplyRequestResponse) {
  const quantity = target.approvedQuantity ?? target.requestedQuantity;
  return `${target.skuSnapshot.productName} - ${target.skuSnapshot.variantName} x ${quantity}`;
}
