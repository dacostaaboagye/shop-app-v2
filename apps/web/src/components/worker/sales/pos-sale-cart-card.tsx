"use client";

import type { CurrentAssignment, PosPaymentMethod } from "@shop/contracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { CartRow, CartTitle, CartTitleBadge } from "./pos-sale-page-sections";

export type CartItem = {
  assignment: CurrentAssignment;
  quantity: number;
  unitPrice: string;
};

export type CartBodyProps = {
  cart: CartItem[];
  error: unknown;
  isPending: boolean;
  notes: string;
  onConfirm: () => void;
  onNotesChange: (value: string) => void;
  onPaymentMethodChange: (value: PosPaymentMethod) => void;
  onPriceChange: (skuId: string, unitPrice: string) => void;
  onRemove: (skuId: string) => void;
  onUpdate: (skuId: string, delta: number) => void;
  paymentMethod: PosPaymentMethod;
};

const PAYMENT_METHODS: { label: string; value: PosPaymentMethod }[] = [
  { label: "Cash", value: "cash" },
  { label: "Card", value: "card" },
  { label: "Mobile money", value: "mobile_money" },
  { label: "Transfer", value: "transfer" },
];

export function CartBody({
  cart,
  error,
  isPending,
  notes,
  onConfirm,
  onNotesChange,
  onPaymentMethodChange,
  onPriceChange,
  onRemove,
  onUpdate,
  paymentMethod,
}: CartBodyProps) {
  const total = cart.reduce((sum, item) => {
    const price = parseFloat(item.unitPrice);
    return sum + (Number.isNaN(price) ? 0 : price * item.quantity);
  }, 0);

  if (cart.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add variants from the list to start a sale.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {cart.map((item) => (
          <CartRow
            key={item.assignment.skuId}
            item={item}
            onPriceChange={(price) =>
              onPriceChange(item.assignment.skuId, price)
            }
            onRemove={() => onRemove(item.assignment.skuId)}
            onUpdate={(delta) => onUpdate(item.assignment.skuId, delta)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2.5 text-sm">
        <span className="text-muted-foreground">Total</span>
        <span className="font-semibold tabular-nums">{total.toFixed(2)}</span>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">Payment method</p>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method.value}
              className={`rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${
                paymentMethod === method.value
                  ? "border-primary bg-primary/5 font-medium text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
              onClick={() => onPaymentMethodChange(method.value)}
              type="button"
            >
              {method.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-sm">Notes (optional)</Label>
        <Textarea
          className="resize-none"
          maxLength={500}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Any notes about this sale..."
          rows={2}
          value={notes}
        />
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
          {error instanceof Error
            ? error.message
            : "Failed to process sale. Try again."}
        </p>
      ) : null}

      <Button
        className="w-full"
        disabled={isPending}
        onClick={onConfirm}
        size="lg"
        type="button"
      >
        {isPending ? "Processing..." : "Confirm sale"}
      </Button>
    </div>
  );
}

export function PosSaleCartCard(props: CartBodyProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CartTitle />
          <CartTitleBadge count={props.cart.length} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CartBody {...props} />
      </CardContent>
    </Card>
  );
}
