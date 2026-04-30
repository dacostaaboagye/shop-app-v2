"use client";

import type { CurrentAssignment } from "@shop/contracts";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCount } from "@/lib/display/format";
import {
  formatMoney,
  type MoneyProfile,
  toNumericAmount,
} from "@/lib/money/format-money";
import { cn } from "@/lib/utils";

export function VariantRow({
  assignment,
  cartQuantity,
  isPrimarySearchMatch = false,
  isRecentlyAdded = false,
  inCart,
  moneyProfile,
  onAdd,
}: {
  assignment: CurrentAssignment;
  cartQuantity: number;
  isPrimarySearchMatch?: boolean;
  isRecentlyAdded?: boolean;
  inCart: boolean;
  moneyProfile: MoneyProfile;
  onAdd: () => void;
}) {
  const unavailable = assignment.availableQuantity <= 0;

  return (
    <div
      aria-disabled={unavailable}
      className={cn(
        "group relative grid gap-4 p-4 transition-all sm:grid-cols-[minmax(0,1fr)_auto]",
        unavailable && "cursor-not-allowed opacity-50",
        inCart ? "bg-muted/35" : "hover:bg-muted/60",
        isPrimarySearchMatch && "ring-1 ring-primary/30",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
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

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1">
            <h4 className="text-balance text-sm font-semibold leading-tight transition-colors group-hover:text-primary">
              {assignment.productName}
            </h4>
            <p className="type-support text-pretty">{assignment.variantName}</p>
            <p className="type-identifier break-all">{assignment.sku}</p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
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
              {formatCount(assignment.availableQuantity)} Available
            </Badge>
            {inCart ? (
              <Badge className="rounded-lg border-none bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground shadow-none">
                {formatCount(cartQuantity)} in cart
              </Badge>
            ) : null}
            {isPrimarySearchMatch ? (
              <Badge className="rounded-lg border-none bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary shadow-none">
                Scan match
              </Badge>
            ) : null}
            {isRecentlyAdded ? (
              <Badge className="rounded-lg border-none bg-success px-2 py-0.5 text-[10px] font-bold text-success-foreground shadow-none">
                Added now
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col items-start gap-3 sm:items-end">
        <p className="text-sm font-bold tabular-nums whitespace-nowrap">
          {formatMoney(assignment.sellingPrice, moneyProfile)}
        </p>
        <Button
          className="min-w-24"
          disabled={unavailable}
          onClick={onAdd}
          size="sm"
          type="button"
          variant={inCart ? "secondary" : "default"}
        >
          {unavailable ? "Unavailable" : inCart ? "Add more" : "Add"}
        </Button>
      </div>
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
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <ProductThumbnail
            className="size-11 shrink-0 rounded-xl"
            imageUrl={item.assignment.primaryImageUrl}
            productName={item.assignment.productName}
            variantName={item.assignment.variantName}
          />
          <div className="min-w-0 flex flex-col gap-1">
            <h4 className="text-balance text-sm font-semibold leading-tight">
              {item.assignment.productName}
            </h4>
            <p className="type-support text-pretty">
              {item.assignment.variantName}
            </p>
            <p className="type-identifier break-all">{item.assignment.sku}</p>
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

      <div className="grid gap-4 border-t border-border/70 pt-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-end">
        <div className="flex flex-col gap-1">
          <span className="type-data-label">Qty</span>
          <div className="flex items-center gap-1 rounded-xl bg-background p-1 ring-1 ring-border shadow-sm">
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
        </div>

        <div className="flex min-w-0 flex-col gap-1 sm:items-end">
          <span className="type-data-label">Unit price</span>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Input
              aria-label="Unit price"
              className={cn(
                "h-9 w-full min-w-0 max-w-32 text-right text-sm font-bold tabular-nums",
                isCustomPrice
                  ? "border-warning text-warning-foreground"
                  : "border-border/60 text-foreground",
              )}
              min="0"
              onChange={(e) => onPriceChange(e.target.value)}
              step="0.01"
              type="number"
              value={item.unitPrice}
            />
            {isCustomPrice ? (
              <button
                className="type-support text-primary underline-offset-4 hover:underline sm:text-right"
                onClick={() => onPriceChange(item.assignment.sellingPrice)}
                title="Reset to catalog price"
                type="button"
              >
                Reset price
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-1 sm:items-end">
          <span className="type-data-label">Subtotal</span>
          <p className="text-sm font-bold whitespace-nowrap tabular-nums text-primary">
            {formatMoney(lineTotal, moneyProfile)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CartTitleBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Badge className="ml-auto rounded-lg border-none bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm">
      {formatCount(count)} Item{count !== 1 ? "s" : ""}
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
