"use client";

import type { VariantSearchResult } from "@shop/contracts";
import { Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectedVariantEntry = {
  quantity: number;
  variant: VariantSearchResult;
};

type Props = {
  entries: SelectedVariantEntry[];
  onQuantityChange: (skuId: string, quantity: number) => void;
  onRemove: (skuId: string) => void;
};

export function AssignmentQuantityEditor({
  entries,
  onQuantityChange,
  onRemove,
}: Props) {
  if (entries.length === 0) return null;

  return (
    <div className="divide-y divide-border rounded-md border border-border">
      {entries.map(({ variant, quantity }) => {
        const max = variant.onHandQuantity;
        const atMax = quantity >= max;

        return (
          <div className="flex items-center gap-3 px-4 py-3" key={variant.id}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-snug">
                {variant.productName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {variant.name} &middot; {variant.sku} &middot;{" "}
                <span className={cn(atMax ? "text-amber-600" : "")}>
                  {max} available
                </span>
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                aria-label="Decrease quantity"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                disabled={quantity <= 1}
                onClick={() => onQuantityChange(variant.id, quantity - 1)}
                type="button"
              >
                <Minus className="size-3" />
              </button>
              <input
                aria-label="Quantity"
                className="h-7 w-14 rounded-md border border-border bg-background text-center text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                max={max}
                min={1}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    onQuantityChange(variant.id, Math.min(Math.max(1, val), max));
                  }
                }}
                type="number"
                value={quantity}
              />
              <button
                aria-label="Increase quantity"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                disabled={atMax}
                onClick={() =>
                  onQuantityChange(variant.id, Math.min(quantity + 1, max))
                }
                type="button"
              >
                <Plus className="size-3" />
              </button>
            </div>

            <button
              aria-label={`Remove ${variant.name}`}
              className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onRemove(variant.id)}
              type="button"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
