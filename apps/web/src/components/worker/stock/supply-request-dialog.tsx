"use client";

import type { StockSupplyRequestResponse } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, MapPin } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
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
  fetchSupplyRequestSources,
  postWorkerSupplyRequest,
  supplyRequestSourcesQueryKey,
  workerSupplyRequestsQueryKey,
} from "@/lib/react-query/stock-supply";

type SupplyRequestTarget = {
  locationId: string;
  locationName: string;
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

  const sourceLocationsQuery = useQuery({
    enabled: open && !!target,
    queryFn: () => fetchSupplyRequestSources(target!.locationId),
    queryKey: supplyRequestSourcesQueryKey(target?.locationId ?? ""),
    staleTime: 60_000,
  });

  const sourceLocations = sourceLocationsQuery.data?.items ?? [];

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

  const submitDisabled =
    mutation.isPending ||
    !sourceLocationId ||
    sourceLocationsQuery.isPending ||
    sourceLocations.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Request supply</DialogTitle>
          <DialogDescription>
            Choose the location that should send stock into your assigned location.
          </DialogDescription>
        </DialogHeader>

        {target ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 px-3 py-3">
              <div>
                <p className="font-medium">{target.productName}</p>
                <p className="text-sm text-muted-foreground">{target.variantName}</p>
                <p className="font-mono text-xs text-muted-foreground">{target.sku}</p>
              </div>

              <div className="flex items-start gap-2 rounded-md bg-background/70 px-2.5 py-2 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 size-3.5 shrink-0" />
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">Destination location</span>
                  <span>{target.locationName}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={sourceId}>Request from</Label>
              {sourceLocationsQuery.isError ? (
                <AppErrorBanner
                  detail="Eligible source locations could not be loaded."
                  error={sourceLocationsQuery.error}
                  onRetry={() => void sourceLocationsQuery.refetch()}
                  title="Unable to load source locations"
                />
              ) : sourceLocations.length === 0 && !sourceLocationsQuery.isPending ? (
                <AppEmptyState
                  description="No other active locations are currently available as transfer sources for this destination."
                  icon={Building2}
                  kind="no-data"
                  title="No source locations"
                />
              ) : (
                <Select
                  id={sourceId}
                  required
                  disabled={sourceLocationsQuery.isPending}
                  value={sourceLocationId}
                  onChange={(e) => setSourceLocationId(e.target.value)}
                >
                  <option value="" disabled>
                    {sourceLocationsQuery.isPending ? "Loading..." : "Select a source location"}
                  </option>
                  {sourceLocations.map((location) => (
                    <option key={location.locationId} value={location.locationId}>
                      {location.locationName}
                    </option>
                  ))}
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                Only source locations eligible to send stock into {target.locationName} are shown.
              </p>
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
                placeholder="Any context for the source location..."
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
              <Button type="submit" disabled={submitDisabled} aria-disabled={submitDisabled}>
                {mutation.isPending ? "Submitting..." : "Submit request"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
