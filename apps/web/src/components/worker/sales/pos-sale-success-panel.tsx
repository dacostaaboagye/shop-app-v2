"use client";

import type { InvoiceResponse } from "@shop/contracts";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
        ? invoice.paymentMethod.charAt(0).toUpperCase() +
          invoice.paymentMethod.slice(1)
        : "-";

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader className="items-center text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle className="size-6" />
        </div>
        <CardTitle className="text-lg">Sale confirmed</CardTitle>
        <p className="font-mono text-sm text-muted-foreground">
          {invoice.reference}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="divide-y divide-border rounded-md border border-border">
          {invoice.lines.map((line) => (
            <div key={line.skuId} className="flex items-center gap-3 px-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {line.skuSnapshot.productName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {line.skuSnapshot.variantName} &times; {line.quantity} @{" "}
                  {line.unitPrice}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">
                {line.lineTotal}
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-semibold tabular-nums">
            {invoice.totalAmount}
          </span>
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
