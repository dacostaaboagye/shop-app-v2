"use client";

import type { CurrentAssignment, PosPaymentMethod } from "@shop/contracts";
import { AppFormField } from "@/components/forms/app-form-field";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { formatCount } from "@/lib/display/format";
import {
  formatMoney,
  type MoneyProfile,
  toNumericAmount,
} from "@/lib/money/format-money";
import type { PosSaleCustomerDetails } from "./pos-sale-customer-details.support";
import { PosSaleCustomerDetailsPanel } from "./pos-sale-customer-details-panel";
import { CartRow, CartTitle, CartTitleBadge } from "./pos-sale-page-sections";

export type CartItem = {
  assignment: CurrentAssignment;
  quantity: number;
  unitPrice: string;
};

export type CartBodyProps = {
  cart: CartItem[];
  customerDetails: PosSaleCustomerDetails;
  error: unknown;
  isPending: boolean;
  moneyProfile: MoneyProfile;
  notes: string;
  onConfirm: () => void;
  onCustomerDetailsChange: (details: PosSaleCustomerDetails) => void;
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
  customerDetails,
  error,
  isPending,
  moneyProfile,
  notes,
  onConfirm,
  onCustomerDetailsChange,
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
  const hasBuyerDetails = Boolean(
    customerDetails.name.trim() ||
      customerDetails.email.trim() ||
      customerDetails.phone.trim() ||
      customerDetails.taxNumber.trim() ||
      customerDetails.billingAddress.trim(),
  );

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

      <div className="rounded-xl border border-border bg-muted/20 p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="type-data-label">Amount due</span>
            <span className="type-stat-value text-primary">
              {formatMoney(total, moneyProfile)}
            </span>
          </div>
          <div className="rounded-lg bg-background px-3 py-2 text-right shadow-sm ring-1 ring-border/70">
            <p className="type-data-label">Items</p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {formatCount(cart.length)}
            </p>
          </div>
        </div>
      </div>

      <Separator className="opacity-50" />

      <PosSaleCustomerDetailsPanel
        details={customerDetails}
        onChange={onCustomerDetailsChange}
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/60 p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <p className="type-data-label">Payment method</p>
          <p className="type-support">
            Select how the customer is settling this sale.
          </p>
        </div>
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
                {paymentMethod === method.value ? "Selected" : "Available"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background/60 p-4 shadow-sm">
        <AppFormField
          description="Optional context for handover or review."
          inputId="pos-sale-notes"
          label="Notes"
        >
          <Textarea
            className="min-h-[88px] resize-none border-border/60 bg-muted transition-all focus:bg-background focus:ring-primary/20"
            id="pos-sale-notes"
            maxLength={500}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="Add anything the next shift should know."
            value={notes}
          />
        </AppFormField>
      </div>

      <div className="rounded-xl border border-border bg-background/60 p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="type-data-label">Ready to confirm</p>
            <p className="type-support">
              Review the transaction summary before processing payment.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <CheckoutStatusTile
              label="Items"
              value={`${formatCount(cart.length)} selected`}
            />
            <CheckoutStatusTile
              label="Payment"
              value={
                PAYMENT_METHODS.find((method) => method.value === paymentMethod)
                  ?.label ?? "Not set"
              }
            />
            <CheckoutStatusTile
              label="Buyer details"
              value={hasBuyerDetails ? "Included" : "Walk-in sale"}
            />
          </div>
        </div>
      </div>

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

function CheckoutStatusTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-card px-3 py-3 shadow-sm ring-1 ring-border/70">
      <p className="type-data-label">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
