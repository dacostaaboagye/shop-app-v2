"use client";

import type {
  AdminStockBalanceSummary,
  AdminStockCountRequest,
} from "@shop/contracts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StockCountForm } from "./stock-count-form";

type Props = {
  error: unknown;
  isPending: boolean;
  locationName: string;
  locationSlug: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (req: AdminStockCountRequest) => void;
  open: boolean;
  /** Pre-filled when opened from an existing balance row; null for a fresh count. */
  row: AdminStockBalanceSummary | null;
};

export function StockCountDialog({
  error,
  isPending,
  locationName,
  locationSlug,
  onOpenChange,
  onSubmit,
  open,
  row,
}: Props) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {row ? "Update stock" : "Record stock count"}
          </DialogTitle>
          <DialogDescription>
            {row
              ? `Update physical count for ${row.sku}. Current: ${row.onHandQuantity}.`
              : `Record current on-hand inventory${locationName ? ` for ${locationName}` : ""}.`}
          </DialogDescription>
        </DialogHeader>

        <StockCountForm
          error={error}
          isPending={isPending}
          locationSlug={locationSlug}
          onSubmit={onSubmit}
          open={open}
          row={row}
        />

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="ghost">
            Cancel
          </Button>
          <Button form="count-form" disabled={isPending} type="submit">
            {isPending ? "Saving..." : "Save count"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
