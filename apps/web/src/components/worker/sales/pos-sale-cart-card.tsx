"use client";

import type { CurrentAssignment, PosPaymentMethod } from "@shop/contracts";
import { AppFormField } from "@/components/forms/app-form-field";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  formatMoney,
  type MoneyProfile,
  toNumericAmount,
} from "@/lib/money/format-money";
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
  moneyProfile: MoneyProfile;
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
] as const;

export function CartBody({
  cart,
  error,
  isPending,
  moneyProfile,
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
    const price = toNumericAmount(item.unitPrice);
    return sum + (price == null ? 0 : price * item.quantity);
  }, 0);

  if (cart.length === 0) {
    return (
      <AppEmptyState
        description="Add variants from the list to start a sale."
        title="Cart is empty"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {cart.map((item) => (
          <CartRow
            key={item.assignment.skuId}
            item={item}
            moneyProfile={moneyProfile}
            onPriceChange={(price) =>
              onPriceChange(item.assignment.skuId, price)
            }
            onRemove={() => onRemove(item.assignment.skuId)}
            onUpdate={(delta) => onUpdate(item.assignment.skuId, delta)}
          />
        ))}
      </div>

      <div className="rounded-xl bg-muted/25 p-4 ring-1 ring-border/70">
        <div className="flex items-center justify-between">
          <span className="type-data-label">Grand Total</span>
          <span className="type-stat-value text-primary">
            {formatMoney(total, moneyProfile)}
          </span>
        </div>
      </div>

      <Separator className="opacity-50" />

      <div className="flex flex-col gap-3">
        <p className="type-data-label">Payment Method</p>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method.value}
              className={`group flex flex-col gap-1 rounded-xl border p-3 text-left transition-all active:scale-[0.98] ${
                paymentMethod === method.value
                  ? "border-primary bg-muted ring-1 ring-primary/20 shadow-sm"
                  : "border-border/60 bg-card shadow-sm hover:border-primary/30 hover:bg-muted"
              }`}
              onClick={() => onPaymentMethodChange(method.value)}
              type="button"
            >
              <span
                className={`text-xs font-bold ${
                  paymentMethod === method.value
                    ? "text-primary"
                    : "text-foreground"
                }`}
              >
                {method.label}
              </span>
              <span className="type-support text-[10px] opacity-70 group-hover:opacity-100">
                Select to pay
              </span>
            </button>
          ))}
        </div>
      </div>

      <AppFormField
        description="Capture anything the next shift or supervisor should know about this sale."
        inputId="pos-sale-notes"
        label="Notes"
      >
        <Textarea
          className="min-h-[80px] resize-none border-border/60 bg-muted transition-all focus:bg-background focus:ring-primary/20"
          id="pos-sale-notes"
          maxLength={500}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Any notes about this sale..."
          value={notes}
        />
      </AppFormField>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs font-medium text-destructive">
          <CartTitle />
          <p className="flex-1">
            {error instanceof Error
              ? error.message
              : "Failed to process sale. Try again."}
          </p>
        </div>
      ) : null}

      <Button
        className="h-14 w-full rounded-xl font-heading text-lg font-bold shadow-sm transition-all active:scale-[0.98]"
        disabled={isPending}
        onClick={onConfirm}
        size="lg"
        type="button"
      >
        {isPending ? "Processing..." : "Confirm Sale"}
      </Button>
    </div>
  );
}

export function PosSaleCartCard(props: CartBodyProps) {
  return (
    <Card className="h-fit w-full overflow-hidden border-none bg-card shadow-sm ring-1 ring-border">
      <CardHeader className="border-b border-border bg-card pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <CartTitle />
          <CartTitleBadge count={props.cart.length} />
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 pt-6">
        <CartBody {...props} />
      </CardContent>
    </Card>
  );
}
