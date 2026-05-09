"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, PackageCheck } from "lucide-react";
import { CatalogFormCard } from "@/components/admin/catalog/catalog-form-surfaces";
import { AppErrorBanner } from "@/components/system/app-error";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  postManagerOpeningStock,
  postManagerStockCount,
  postOpeningStock,
  postStockCount,
} from "@/lib/react-query/stock-admin";
import type {
  StockTakeLine,
  StockTakePortal,
} from "@/lib/react-query/stock-takes";
import { toast } from "@/lib/toast";
import {
  buildCatalogFoundStockRequest,
  buildCatalogOpeningStockRequest,
  type CatalogIntakeCreatedDraft,
  getCatalogStockIntakeDisabledReason,
  getCatalogStockIntakeSku,
} from "./stock-take-catalog-intake.support";

type StockTakeCatalogStockActionProps = {
  createdDraft: CatalogIntakeCreatedDraft | null;
  disabledReason: string | null;
  line: StockTakeLine;
  locationName: string;
  locationSlug: string;
  portal: StockTakePortal;
  reference: string;
};

export function StockTakeCatalogStockAction({
  createdDraft,
  disabledReason,
  line,
  locationName,
  locationSlug,
  portal,
  reference,
}: StockTakeCatalogStockActionProps) {
  const queryClient = useQueryClient();
  const openingMutation = useMutation({
    mutationFn:
      portal === "manager" ? postManagerOpeningStock : postOpeningStock,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["stock", "balances"] });
      toast.success(
        `${result.initializedCount} opening stock baseline(s) recorded`,
      );
    },
  });
  const countMutation = useMutation({
    mutationFn: portal === "manager" ? postManagerStockCount : postStockCount,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["stock", "balances"] });
      toast.success(`Stock count recorded for ${result.sku}`);
    },
  });

  const readinessReason = getCatalogStockIntakeDisabledReason({
    createdDraft,
    line,
  });
  const lockReason = disabledReason ?? readinessReason;
  const hasRecordedStock =
    openingMutation.data !== undefined || countMutation.data !== undefined;
  const stockError = openingMutation.error ?? countMutation.error;
  const actionDisabled =
    lockReason !== null || openingMutation.isPending || countMutation.isPending;
  const sku = getCatalogStockIntakeSku(line, createdDraft);

  function recordOpeningStock() {
    openingMutation.reset();
    countMutation.reset();
    openingMutation.mutate(
      buildCatalogOpeningStockRequest({
        createdDraft,
        line,
        locationSlug,
        reference,
      }),
    );
  }

  function recordFoundStock() {
    openingMutation.reset();
    countMutation.reset();
    countMutation.mutate(
      buildCatalogFoundStockRequest({
        createdDraft,
        line,
        locationSlug,
        reference,
      }),
    );
  }

  return (
    <CatalogFormCard
      description="After catalog review activates the SKU, record the counted quantity as either the first baseline or a found-stock correction."
      title="Review stock quantity"
    >
      <div className="flex flex-col gap-4">
        <StockReviewNotice />
        <div className="grid gap-3 md:grid-cols-3">
          <StockReviewFact
            label="SKU"
            value={sku ? sku : "Pending draft SKU"}
          />
          <StockReviewFact
            label="Counted quantity"
            value={
              line.countedQuantity === null
                ? "Not counted"
                : String(line.countedQuantity)
            }
          />
          <StockReviewFact label="Location" value={locationName} />
        </div>
        {lockReason ? (
          <Alert variant="destructive">
            <AlertTitle>Stock review locked</AlertTitle>
            <AlertDescription>{lockReason}</AlertDescription>
          </Alert>
        ) : null}
        {stockError ? (
          <AppErrorBanner
            detail="The stock action did not complete. Confirm the catalog draft is active and choose the path that matches the SKU baseline state."
            error={stockError}
            title="Unable to record stock"
          />
        ) : null}
        {hasRecordedStock ? (
          <Alert>
            <AlertTitle>Stock review recorded</AlertTitle>
            <AlertDescription>
              The movement was recorded through the stock ledger and can be
              reviewed from stock levels.
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            disabled={actionDisabled}
            onClick={recordOpeningStock}
            size="sm"
            type="button"
            variant="outline"
          >
            <PackageCheck data-icon="inline-start" />
            Initialize opening stock
          </Button>
          <Button
            disabled={actionDisabled}
            onClick={recordFoundStock}
            size="sm"
            type="button"
          >
            <ClipboardCheck data-icon="inline-start" />
            Record found-stock count
          </Button>
        </div>
      </div>
    </CatalogFormCard>
  );
}

function StockReviewNotice() {
  return (
    <Alert>
      <AlertTitle>Choose the stock path deliberately</AlertTitle>
      <AlertDescription>
        Use opening stock only when this SKU has no location baseline. Use
        found-stock count when a baseline already exists and the counted
        quantity should become the new on-hand value.
      </AlertDescription>
    </Alert>
  );
}

function StockReviewFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <Badge className="mt-2 max-w-full truncate" variant="secondary">
        {value}
      </Badge>
    </div>
  );
}
