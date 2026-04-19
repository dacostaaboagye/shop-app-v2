"use client";

import type {
  CurrentAssignment,
  InvoiceResponse,
} from "@shop/contracts";
import { CheckCircle, Minus, Package, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function VariantRow({
  assignment,
  cartQuantity,
  inCart,
  onAdd,
}: {
  assignment: CurrentAssignment;
  cartQuantity: number;
  inCart: boolean;
  onAdd: () => void;
}) {
  const unavailable = assignment.availableQuantity <= 0;

  return (
    <button
      className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-accent/40 active:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={unavailable}
      onClick={onAdd}
      type="button"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Package className="size-4" />
          {inCart && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {cartQuantity}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-snug">
            {assignment.productName}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {assignment.variantName} &middot; {assignment.sku}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <p className="text-sm font-semibold tabular-nums">
          {assignment.sellingPrice}
        </p>
        <p
          className={`text-xs tabular-nums ${
            assignment.availableQuantity === 0
              ? "text-destructive"
              : "text-muted-foreground"
          }`}
        >
          {assignment.availableQuantity} avail.
        </p>
      </div>
    </button>
  );
}

export function CartRow({
  item,
  onPriceChange,
  onRemove,
  onUpdate,
}: {
  item: { assignment: CurrentAssignment; quantity: number; unitPrice: string };
  onPriceChange: (price: string) => void;
  onRemove: () => void;
  onUpdate: (delta: number) => void;
}) {
  const price = parseFloat(item.unitPrice);
  const lineTotal = isNaN(price) ? 0 : price * item.quantity;
  const isCustomPrice = item.unitPrice !== item.assignment.sellingPrice;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-snug">
            {item.assignment.productName}
          </p>
          <p className="text-xs text-muted-foreground">{item.assignment.variantName}</p>
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
            className={`h-9 w-24 rounded-md border bg-background px-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary ${
              isCustomPrice
                ? "border-amber-400 text-amber-700"
                : "border-border text-foreground"
            }`}
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
        <p className="text-sm font-semibold tabular-nums">{lineTotal.toFixed(2)}</p>
      </div>
    </div>
  );
}

export function SaleSuccessPanel({
  invoice,
  onNewSale,
}: {
  invoice: InvoiceResponse;
  onNewSale: () => void;
}) {
  const paymentLabel =
    invoice.paymentMethod === "mobile_money"
      ? "Mobile money"
      : invoice.paymentMethod
        ? invoice.paymentMethod.charAt(0).toUpperCase() + invoice.paymentMethod.slice(1)
        : "-";

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader className="items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle className="size-6" />
        </div>
        <CardTitle className="text-lg">Sale confirmed</CardTitle>
        <p className="font-mono text-sm text-muted-foreground">{invoice.reference}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="divide-y divide-border rounded-md border border-border">
          {invoice.lines.map((line) => (
            <div key={line.skuId} className="flex items-center gap-3 px-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{line.skuSnapshot.productName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {line.skuSnapshot.variantName} &times; {line.quantity} @ {line.unitPrice}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">{line.lineTotal}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-semibold tabular-nums">{invoice.totalAmount}</span>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Payment: {paymentLabel}
        </p>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={onNewSale} variant="outline">
          New sale
        </Button>
      </CardFooter>
    </Card>
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
