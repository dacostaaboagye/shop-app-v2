"use client";

import type { InvoiceListResponse } from "@shop/contracts";
import { Receipt } from "lucide-react";
import Link from "next/link";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { Badge } from "@/components/ui/badge";
import { formatMoney, type MoneyProfile } from "@/lib/money/format-money";
import { toRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function ManagerSalesList(props: {
  moneyProfile: MoneyProfile;
  response: InvoiceListResponse;
}) {
  if (props.response.items.length === 0) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-dashed border-border/60 bg-muted/5 p-12 text-center shadow-sm">
        <h3 className="text-lg font-bold text-foreground">No sales recorded</h3>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground/80">
          No transactions have been recorded at this location for the selected
          period.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
        Transaction history ({props.response.total})
      </h3>
      <AppTableWrapper>
        {props.response.items.map((invoice, index) => {
          const paymentLabel =
            invoice.paymentMethod === "mobile_money"
              ? "Mobile money"
              : invoice.paymentMethod
                ? invoice.paymentMethod.charAt(0).toUpperCase() +
                  invoice.paymentMethod.slice(1)
                : "Other";

          return (
            <Link
              key={invoice.reference}
              className={cn(
                "group flex items-center justify-between gap-4 p-4 transition-all hover:bg-muted/30",
                index !== props.response.items.length - 1 &&
                  "border-b border-border/50",
              )}
              href={toRoute(
                `/manager/sales/${encodeURIComponent(invoice.reference)}`,
              )}
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary ring-1 ring-primary/10 transition-colors group-hover:bg-primary/10">
                  <Receipt className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-bold text-foreground">
                    {invoice.reference}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    {new Date(invoice.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <div className="hidden flex-col items-end sm:flex">
                  <Badge
                    className="rounded-md font-bold uppercase tracking-wider text-[10px]"
                    variant={
                      invoice.type === "credit_note"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {invoice.type === "credit_note" ? "Return" : "Sale"}
                  </Badge>
                  <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                    {paymentLabel}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {formatMoney(invoice.totalAmount, props.moneyProfile)}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60 transition-colors group-hover:text-primary">
                    Details →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </AppTableWrapper>
    </div>
  );
}
