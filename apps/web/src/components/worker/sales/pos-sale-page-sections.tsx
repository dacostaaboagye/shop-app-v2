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
        "group relative flex w-full items-center gap-4 p-4 text-left transition-all hover:bg-muted",
        unavailable && "cursor-not-allowed opacity-50",
        inCart && "bg-white",
      )}
    >
      <div className="relative size-12 shrink-0 sm:size-14">
        <ProductThumbnail
          className={cn(
            "size-12 rounded-xl transition-transform group-hover:scale-105 sm:size-14",
            inCart && "ring-2 ring-primary/20",
          )}
          imageUrl={assignment.primaryImageUrl}
          productName={assignment.productName}
          variantName={assignment.variantName}
        />
        {inCart && (
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
            {cartQuantity}
          </span>
        )}
      </div>
      <button
        className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left disabled:cursor-not-allowed"
        disabled={unavailable}
        onClick={onAdd}
        type="button"
      >
        <div className="min-w-0">
          <h4 className="truncate text-sm font-bold leading-tight group-hover:text-primary transition-colors">
            {assignment.productName}
          </h4>
          <p className="mt-1 truncate text-xs font-medium text-muted-foreground/80">
            {assignment.variantName}
          </p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/40">
            {assignment.sku}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <p className="text-sm font-bold tabular-nums">
            {formatMoney(assignment.sellingPrice, moneyProfile)}
          </p>
          <Badge
            className={cn(
              "rounded-lg px-2 py-0.5 text-[10px] font-bold tabular-nums shadow-sm border-none",
              assignment.availableQuantity === 0
                ? "bg-destructive text-destructive-foreground"
                : assignment.availableQuantity <= 3
                  ? "bg-warning text-warning-foreground"
                  : "bg-success text-success-foreground",
            )}
          >
            {assignment.availableQuantity} avail.
          </Badge>
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
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4 shadow-sm transition-all hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <ProductThumbnail
            className="size-11 shrink-0 rounded-xl"
            imageUrl={item.assignment.primaryImageUrl}
            productName={item.assignment.productName}
            variantName={item.assignment.variantName}
          />
          <div className="min-w-0">
            <h4 className="truncate text-sm font-bold leading-tight">
              {item.assignment.productName}
            </h4>
            <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground/80">
              {item.assignment.variantName}
            </p>
          </div>
        </div>
        <button
          aria-label="Remove from cart"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 transition-all hover:bg-destructive/10 hover:text-destructive active:scale-90"
          onClick={onRemove}
          type="button"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        {/* Quantity stepper */}
        <div className="flex items-center gap-1 rounded-xl bg-white p-1 ring-1 ring-border shadow-sm">
          <button
            aria-label="Decrease quantity"
            className="flex size-8 items-center justify-center rounded-lg bg-background text-muted-foreground transition-all hover:text-foreground active:scale-90 disabled:opacity-30 shadow-sm"
            disabled={item.quantity <= 1}
            onClick={() => onUpdate(-1)}
            type="button"
          >
            <Minus className="size-3.5" />
          </button>
          <span className="w-8 text-center text-sm font-bold tabular-nums">
            {item.quantity}
          </span>
          <button
            aria-label="Increase quantity"
            className="flex size-8 items-center justify-center rounded-lg bg-background text-muted-foreground transition-all hover:text-foreground active:scale-90 disabled:opacity-30 shadow-sm"
            disabled={item.quantity >= item.assignment.availableQuantity}
            onClick={() => onUpdate(1)}
            type="button"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        {/* Price & Total */}
        <div className="flex flex-1 items-center justify-end gap-4">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Unit Price
              </span>
              <div className="relative">
                <input
                  aria-label="Unit price"
                  className={cn(
                    "h-8 w-20 rounded-lg border bg-background px-2 text-right text-xs font-bold tabular-nums transition-all focus:outline-none focus:ring-2 focus:ring-primary/20",
                    isCustomPrice
                      ? "border-warning text-warning-foreground"
                      : "border-border/50 text-foreground",
                  )}
                  min="0"
                  onChange={(e) => onPriceChange(e.target.value)}
                  step="0.01"
                  type="number"
                  value={item.unitPrice}
                />
              </div>
            </div>
            {isCustomPrice && (
              <button
                className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline underline-offset-4"
                onClick={() => onPriceChange(item.assignment.sellingPrice)}
                title="Reset to catalog price"
                type="button"
              >
                Reset Price
              </button>
            )}
          </div>

          <div className="flex flex-col items-end gap-0.5 min-w-[80px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
              Subtotal
            </span>
            <p className="text-sm font-bold tabular-nums text-primary">
              {formatMoney(lineTotal, moneyProfile)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CartTitleBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Badge className="ml-auto bg-primary text-primary-foreground border-none rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm">
      {count} item{count !== 1 ? "s" : ""}
    </Badge>
  );
}

export function CartTitle() {
  return (
    <div className="flex items-center gap-2">
      <ShoppingCart className="size-4" />
      Cart
    </div>
  );
}
