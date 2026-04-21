"use client";

import type { CurrentAssignment } from "@shop/contracts";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { Badge } from "@/components/ui/badge";
import {
  formatMoney,
  type MoneyProfile,
  toNumericAmount,
} from "@/lib/money/format-money";
import { cn } from "@/lib/utils";

export function VariantRow({
  assignment,
  cartQuantity,
  inCart,
  moneyProfile,
  onAdd,
}: {
  assignment: CurrentAssignment;
  cartQuantity: number;
  inCart: boolean;
  moneyProfile: MoneyProfile;
  onAdd: () => void;
}) {
  const unavailable = assignment.availableQuantity <= 0;

  return (
    <div
      aria-disabled={unavailable}
      className={cn(
        "flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent/40",
        unavailable && "cursor-not-allowed opacity-60",
      )}
    >
      <div className="relative size-10 shrink-0">
        <ProductThumbnail
          className="size-10"
          imageUrl={assignment.primaryImageUrl}
          productName={assignment.productName}
          variantName={assignment.variantName}
        />
        {inCart && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            {cartQuantity}
          </span>
        )}
      </div>
      <button
        className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left disabled:cursor-not-allowed"
        disabled={unavailable}
        onClick={onAdd}
        type="button"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-snug">
            {assignment.productName}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {assignment.variantName} &middot; {assignment.sku}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <p className="text-sm font-semibold tabular-nums">
            {formatMoney(assignment.sellingPrice, moneyProfile)}
          </p>
          <p
            className={cn(
              "text-xs tabular-nums",
              assignment.availableQuantity === 0
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            {assignment.availableQuantity} avail.
          </p>
        </div>
      </button>
    </div>
  );
}

export function CartRow({
  item,
  moneyProfile,
  onPriceChange,
  onRemove,
  onUpdate,
}: {
  item: { assignment: CurrentAssignment; quantity: number; unitPrice: string };
  moneyProfile: MoneyProfile;
  onPriceChange: (price: string) => void;
  onRemove: () => void;
  onUpdate: (delta: number) => void;
}) {
  const price = toNumericAmount(item.unitPrice);
  const lineTotal = price == null ? 0 : price * item.quantity;
  const isCustomPrice = item.unitPrice !== item.assignment.sellingPrice;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <ProductThumbnail
            className="size-10 shrink-0"
            imageUrl={item.assignment.primaryImageUrl}
            productName={item.assignment.productName}
            variantName={item.assignment.variantName}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-snug">
              {item.assignment.productName}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.assignment.variantName}
            </p>
          </div>
        </div>
        <button
          aria-label="Remove from cart"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          onClick={onRemove}
          type="button"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        {/* Quantity stepper */}
        <div className="flex items-center gap-1">
          <button
            aria-label="Decrease quantity"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 disabled:opacity-40"
            disabled={item.quantity <= 1}
            onClick={() => onUpdate(-1)}
            type="button"
          >
            <Minus className="size-3.5" />
          </button>
          <span className="w-8 text-center text-sm font-medium tabular-nums">
            {item.quantity}
          </span>
          <button
            aria-label="Increase quantity"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 disabled:opacity-40"
            disabled={item.quantity >= item.assignment.availableQuantity}
            onClick={() => onUpdate(1)}
            type="button"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        {/* Price input */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">@</span>
          <input
            aria-label="Unit price"
            className={cn(
              "h-9 w-24 rounded-md border bg-background px-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary",
              isCustomPrice
                ? "border-warning text-warning-foreground"
                : "border-border text-foreground",
            )}
            min="0"
            onChange={(e) => onPriceChange(e.target.value)}
            step="0.01"
            type="number"
            value={item.unitPrice}
          />
          {isCustomPrice && (
            <button
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => onPriceChange(item.assignment.sellingPrice)}
              title="Reset to catalog price"
              type="button"
            >
              Reset
            </button>
          )}
        </div>

        {/* Line total */}
        <p className="text-sm font-semibold tabular-nums">
          {formatMoney(lineTotal, moneyProfile)}
        </p>
      </div>
    </div>
  );
}

export function CartTitleBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Badge variant="secondary" className="ml-auto">
      {count} item{count !== 1 ? "s" : ""}
    </Badge>
  );
}

export function CartTitle() {
  return (
    <>
      <ShoppingCart className="size-4" />
      Cart
    </>
  );
}
