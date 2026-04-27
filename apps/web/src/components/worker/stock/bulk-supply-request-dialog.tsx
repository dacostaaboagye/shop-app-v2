"use client";

import type { BulkStockSupplyRequestResponse } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppDialog, AppDialogBody } from "@/components/system/app-dialog";
import { AppErrorBanner } from "@/components/system/app-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import {
  fetchSupplyRequestSources,
  postWorkerSupplyRequestBatch,
  supplyRequestSourcesQueryKey,
  workerSupplyRequestsQueryKey,
} from "@/lib/react-query/stock-supply";
import type { SupplyRequestTarget } from "./supply-request-dialog.types";
import { SourceLocationField } from "./supply-request-dialog-sections";

export function BulkSupplyRequestDialog({
  onOpenChange,
  open,
  targets,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  targets: SupplyRequestTarget[];
}) {
  const notesId = useId();
  const sourceId = useId();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [sourceLocationId, setSourceLocationId] = useState("");

  const destination = targets[0] ?? null;

  useEffect(() => {
    if (!open) {
      setNotes("");
      setSourceLocationId("");
      setQuantities({});
      return;
    }

    setQuantities((current) =>
      Object.fromEntries(
        targets.map((target) => [target.skuId, current[target.skuId] ?? "1"]),
      ),
    );
  }, [open, targets]);

  const sourceLocationsQuery = useQuery({
    enabled: open && !!destination,
    queryFn: () => {
      if (!destination) {
        throw new Error("A destination location is required.");
      }
      return fetchSupplyRequestSources(destination.locationId);
    },
    queryKey: supplyRequestSourcesQueryKey(destination?.locationId ?? ""),
    staleTime: 60_000,
  });

  const sourceLocations = sourceLocationsQuery.data?.items ?? [];
  const items = useMemo(
    () =>
      targets.map((target) => ({
        requestedQuantity: Number.parseInt(quantities[target.skuId] ?? "1", 10),
        skuId: target.skuId,
      })),
    [quantities, targets],
  );

  const mutation = useMutation({
    mutationFn: (payload: {
      items: Array<{ requestedQuantity: number; skuId: string }>;
      locationId: string;
      notes?: string;
      sourceLocationId: string;
    }) => postWorkerSupplyRequestBatch(payload),
    onSuccess(data: BulkStockSupplyRequestResponse) {
      toast.success(
        `Grouped supply request ${data.requestGroupReference} submitted.`,
      );
      void queryClient.invalidateQueries({
        queryKey: workerSupplyRequestsQueryKey({}),
      });
      onOpenChange(false);
    },
    onError(error) {
      toast.error(
        getAppErrorMessage(error, {
          fallbackDetail: "Failed to submit grouped supply request.",
        }),
      );
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!destination || !sourceLocationId || items.length === 0) {
      return;
    }

    if (
      items.some(
        (item) =>
          !Number.isInteger(item.requestedQuantity) ||
          item.requestedQuantity < 1,
      )
    ) {
      return;
    }

    mutation.mutate({
      items,
      locationId: destination.locationId,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      sourceLocationId,
    });
  }

  const submitDisabled =
    mutation.isPending ||
    !destination ||
    !sourceLocationId ||
    sourceLocationsQuery.isPending ||
    sourceLocations.length === 0;

  return (
    <AppDialog
      description="Request multiple assigned variants from one source location in a single grouped supply request."
      onOpenChange={onOpenChange}
      open={open}
      size="lg"
      title="Request grouped supply"
    >
      {destination ? (
        <form onSubmit={handleSubmit}>
          <AppDialogBody className="gap-5">
            <SourceLocationField
              onValueChange={setSourceLocationId}
              sourceId={sourceId}
              sourceLocationId={sourceLocationId}
              sourceLocations={sourceLocations}
              sourceLocationsQuery={sourceLocationsQuery}
              target={destination}
            />

            <div className="rounded-xl border border-border/60 bg-card">
              <div className="border-b border-border/60 px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Selected items
                </h3>
                <p className="type-support mt-1">
                  All items will be requested into {destination.locationName}.
                </p>
              </div>
              <div className="divide-y divide-border/60">
                {targets.map((target) => (
                  <div
                    className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_120px]"
                    key={target.skuId}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {target.productName}
                      </p>
                      <p className="type-support">{target.variantName}</p>
                      <p className="type-identifier mt-1">{target.sku}</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        className="type-data-label text-muted-foreground"
                        htmlFor={`grouped-qty-${target.skuId}`}
                      >
                        Quantity
                      </label>
                      <Input
                        id={`grouped-qty-${target.skuId}`}
                        inputMode="numeric"
                        min={1}
                        required
                        type="number"
                        value={quantities[target.skuId] ?? "1"}
                        onChange={(event) =>
                          setQuantities((current) => ({
                            ...current,
                            [target.skuId]: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="type-data-label text-muted-foreground"
                htmlFor={notesId}
              >
                Purchasing notes
              </label>
              <Textarea
                id={notesId}
                maxLength={500}
                placeholder="Any context for the source location..."
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            {mutation.isError ? (
              <AppErrorBanner
                detail="Grouped supply request could not be submitted."
                error={mutation.error}
                title="Unable to submit request"
              />
            ) : null}
          </AppDialogBody>
          <div className="flex flex-col-reverse gap-2 rounded-b-lg border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={submitDisabled} type="submit">
              {mutation.isPending ? "Submitting..." : "Submit grouped request"}
            </Button>
          </div>
        </form>
      ) : null}
    </AppDialog>
  );
}
