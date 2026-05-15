"use client";

import type {
  AdminStockBalanceSummary,
  StockWriteOffRequest,
} from "@shop/contracts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StockWriteOffForm } from "./stock-write-off-form";

type Props = {
  error: unknown;
  isPending: boolean;
  locationSlug: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (request: StockWriteOffRequest) => void;
  open: boolean;
  row: AdminStockBalanceSummary | null;
};

export function StockWriteOffDialog({
  error,
  isPending,
  locationSlug,
  onOpenChange,
  onSubmit,
  open,
  row,
}: Props) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Write off stock</DialogTitle>
          <DialogDescription>
            {row
              ? `Record loss for ${row.sku}. Available: ${row.availableQuantity}.`
              : "Select a stock row before recording a write-off."}
          </DialogDescription>
        </DialogHeader>
        {row ? (
          <StockWriteOffForm
            error={error}
            isPending={isPending}
            locationSlug={locationSlug}
            onCancel={() => onOpenChange(false)}
            onSubmit={onSubmit}
            row={row}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
