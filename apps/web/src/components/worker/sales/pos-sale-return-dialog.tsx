"use client";

import type { InvoiceResponse } from "@shop/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import { formatMoney, type MoneyProfile } from "@/lib/money/format-money";
import { invoiceQueryKey, postWorkerReturn } from "@/lib/react-query/pos-sales";
import {
  buildReturnRequestDraft,
  getInitialReturnQuantities,
  type ReturnQuantityMap,
} from "./pos-sale-return-dialog.support";

type Props = {
  invoice: InvoiceResponse;
  moneyProfile: MoneyProfile;
  onReturnCreated?: (creditNoteReference: string) => void;
};

export function PosSaleReturnDialog({
  invoice,
  moneyProfile,
  onReturnCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [quantities, setQuantities] = useState<ReturnQuantityMap>(() =>
    getInitialReturnQuantities(invoice.lines),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const reasonId = useId();
  const queryClient = useQueryClient();
  const returnMutation = useMutation({
    mutationFn: () => {
      const draft = buildReturnRequestDraft({
        lines: invoice.lines,
        quantities,
        reason,
      });
      if (!draft.ok) {
        setFieldErrors(draft.fieldErrors);
        setFormError(draft.formError);
        throw new ReturnValidationError();
      }
      setFieldErrors({});
      setFormError(null);
      return postWorkerReturn(invoice.reference, draft.request);
    },
    onError(error) {
      if (error instanceof ReturnValidationError) return;
      toast.error(
        getAppErrorMessage(error, {
          fallbackDetail: "Could not create the return credit note.",
        }),
      );
    },
    onSuccess(creditNote) {
      toast.success(`Credit note ${creditNote.reference} created.`);
      void queryClient.invalidateQueries({
        queryKey: invoiceQueryKey(invoice.reference),
      });
      void queryClient.invalidateQueries({ queryKey: ["sales", "worker"] });
      setOpen(false);
      setReason("");
      setQuantities(getInitialReturnQuantities(invoice.lines));
      onReturnCreated?.(creditNote.reference);
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    returnMutation.mutate();
  }

  if (invoice.type !== "pos" || invoice.status !== "confirmed") return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        size="sm"
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        <RotateCcw data-icon="inline-start" />
        Record return
      </Button>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Record sale return</DialogTitle>
          <DialogDescription>
            Create a credit note for items returned from {invoice.reference}.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="max-h-[45vh] overflow-auto rounded-lg border border-border">
            {invoice.lines.map((line) => (
              <div
                className="grid gap-3 border-b border-border p-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_7rem]"
                key={line.skuId}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {line.skuSnapshot.productName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {line.skuSnapshot.variantName} - {line.skuSnapshot.sku}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sold {line.quantity} at{" "}
                    {formatMoney(line.unitPrice, moneyProfile)}
                  </p>
                </div>
                <ReturnQuantityField
                  error={fieldErrors[line.skuId]}
                  max={line.quantity}
                  onChange={(value) =>
                    setQuantities((current) => ({
                      ...current,
                      [line.skuId]: value,
                    }))
                  }
                  value={quantities[line.skuId] ?? "0"}
                />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={reasonId}>Return reason</Label>
            <Textarea
              aria-invalid={Boolean(fieldErrors.reason)}
              id={reasonId}
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason for the return..."
              rows={3}
              value={reason}
            />
            {fieldErrors.reason ? (
              <p className="text-xs text-destructive">{fieldErrors.reason}</p>
            ) : null}
          </div>
          {formError ? (
            <p className="text-sm text-destructive">{formError}</p>
          ) : null}
          <DialogFooter>
            <Button
              onClick={() => setOpen(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button disabled={returnMutation.isPending} type="submit">
              {returnMutation.isPending ? "Creating..." : "Create credit note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReturnQuantityField({
  error,
  max,
  onChange,
  value,
}: {
  error: string | undefined;
  max: number;
  onChange: (value: string) => void;
  value: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Return qty</Label>
      <Input
        aria-invalid={Boolean(error)}
        id={id}
        inputMode="numeric"
        max={max}
        min={0}
        onChange={(event) => onChange(event.target.value)}
        type="number"
        value={value}
      />
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">Max {max}</p>
      )}
    </div>
  );
}

class ReturnValidationError extends Error {
  constructor() {
    super("Invalid return request.");
  }
}
