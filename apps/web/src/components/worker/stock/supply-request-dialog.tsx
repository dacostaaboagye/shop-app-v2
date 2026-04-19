"use client";

import type { StockSupplyRequestResponse } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import {
  fetchLocations,
  locationsQueryKey,
  postWorkerSupplyRequest,
  workerSupplyRequestsQueryKey,
} from "@/lib/react-query/stock-supply";

type SupplyRequestTarget = {
  locationId: string; // destination — the worker's own location
  productName: string;
  sku: string;
  skuId: string;
  variantName: string;
};

type Props = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  target: SupplyRequestTarget | null;
};

export function SupplyRequestDialog({ onOpenChange, open, target }: Props) {
  const qtyId = useId();
  const notesId = useId();
  const sourceId = useId();
  const [qty, setQty] = useState("1");
  const [notes, setNotes] = useState("");
  const [sourceLocationId, setSourceLocationId] = useState("");
  const queryClient = useQueryClient();

  const locationsQuery = useQuery({
    enabled: open,
    queryFn: fetchLocations,
    queryKey: locationsQueryKey(),
    staleTime: 60_000,
  });

  const sourceLocations = (locationsQuery.data?.items ?? []).filter(
    (l) => l.id !== target?.locationId,
  );

  const mutation = useMutation({
    mutationFn: (data: {
      locationId: string;
      sourceLocationId: string;
      notes?: string;
      requestedQuantity: number;
      skuId: string;
    }) => postWorkerSupplyRequest(data),
    onSuccess(data: StockSupplyRequestResponse) {
      toast.success(`Supply request ${data.reference} submitted.`);
      void queryClient.invalidateQueries({
        queryKey: workerSupplyRequestsQueryKey({}),
      });
      setQty("1");
      setNotes("");
      setSourceLocationId("");
      onOpenChange(false);
    },
    onError(error) {
      toast.error(
        getAppErrorMessage(error, { fallbackDetail: "Failed to submit supply request." }),
      );
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!target || !sourceLocationId) return;
    const parsedQty = parseInt(qty, 10);
    if (!Number.isInteger(parsedQty) || parsedQty < 1) return;
    mutation.mutate({
      locationId: target.locationId,
      sourceLocationId,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      requestedQuantity: parsedQty,
      skuId: target.skuId,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Request supply</DialogTitle>
          <DialogDescription>
            Choose a source location and quantity. The request will be sent for review.
          </DialogDescription>
        </DialogHeader>

        {target ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
              <p className="font-medium">{target.productName}</p>
              <p className="text-sm text-muted-foreground">{target.variantName}</p>
              <p className="font-mono text-xs text-muted-foreground">{target.sku}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={sourceId}>Request from</Label>
              <Select
                id={sourceId}
                required
                disabled={locationsQuery.isPending}
                value={sourceLocationId}
                onChange={(e) => setSourceLocationId(e.target.value)}
              >
                <option value="" disabled>
                  {locationsQuery.isPending ? "Loading…" : "Select a location"}
                </option>
                {sourceLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={qtyId}>Requested quantity</Label>
              <Input
                id={qtyId}
                inputMode="numeric"
                min={1}
                required
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={notesId}>Notes (optional)</Label>
              <Textarea
                id={notesId}
                maxLength={500}
                placeholder="Any context for the source location…"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {mutation.isError ? (
              <p className="text-sm text-destructive">
                {getAppErrorMessage(mutation.error, {
                  fallbackDetail: "Failed to submit supply request.",
                })}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || !sourceLocationId}
                aria-disabled={mutation.isPending || !sourceLocationId}
              >
                {mutation.isPending ? "Submitting…" : "Submit request"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
