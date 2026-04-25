"use client";

import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCount } from "@/lib/display/format";
import { formatMoney, toNumericAmount } from "@/lib/money/format-money";
import { CartBody, type CartBodyProps } from "./pos-sale-cart-card";

type PosSaleMobileCartProps = CartBodyProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PosSaleMobileCart({
  cart,
  open,
  onOpenChange,
  ...cartProps
}: PosSaleMobileCartProps) {
  const itemCount = cart.reduce((count, item) => count + item.quantity, 0);
  const total = cart.reduce((sum, item) => {
    const price = toNumericAmount(item.unitPrice);
    return sum + (price == null ? 0 : price * item.quantity);
  }, 0);

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 shadow-lg backdrop-blur lg:hidden">
        {cart.length === 0 ? (
          <p className="type-support text-center">
            Tap a variant to add it to your cart
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {formatCount(itemCount)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-none">
                  {formatCount(cart.length)} Item{cart.length !== 1 ? "s" : ""}
                </p>
                <p className="type-support mt-0.5 tabular-nums">
                  Total {formatMoney(total, cartProps.moneyProfile)}
                </p>
              </div>
            </div>
            <Button
              className="shrink-0 gap-1.5"
              onClick={() => onOpenChange(true)}
              size="sm"
            >
              <ShoppingCart data-icon="inline-start" />
              Review &amp; Pay
            </Button>
          </div>
        )}
      </div>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="max-h-[88svh] overflow-y-auto" side="bottom">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart data-icon="inline-start" />
              Cart
              {cart.length > 0 ? (
                <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                  {formatCount(cart.length)}
                </span>
              ) : null}
            </SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-8">
            <CartBody cart={cart} {...cartProps} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
