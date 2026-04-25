"use client";

import type { InvoiceListResponse } from "@shop/contracts";
import { Receipt } from "lucide-react";
import Link from "next/link";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { Badge } from "@/components/ui/badge";
import {
  formatCount,
  formatDateTime,
  formatPublicReference,
} from "@/lib/display/format";
import { formatMoney, type MoneyProfile } from "@/lib/money/format-money";
import { toRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function ManagerSalesList(props: {
  moneyProfile: MoneyProfile;
  response: InvoiceListResponse;
}) {
  if (props.response.items.length === 0) {
    return (
      <AppEmptyState
        description="No transactions have been recorded at this location for the selected period."
        icon={Receipt}
        title="No sales recorded"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="type-data-label">
        Transaction History ({formatCount(props.response.total)})
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
                "group flex flex-col gap-4 p-4 transition-all hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between",
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
                  <p className="type-data-value text-balance text-sm">
                    {formatPublicReference(invoice.reference)}
                  </p>
                  <p className="type-support text-xs">
                    {formatDateTime(invoice.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end sm:flex-nowrap sm:gap-4">
                <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
                  <Badge
                    className="rounded-md font-bold text-[10px]"
                    variant={
                      invoice.type === "credit_note"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {invoice.type === "credit_note" ? "Credit Note" : "Sale"}
                  </Badge>
                  <span className="type-data-label text-[10px]">
                    {paymentLabel}
                  </span>
                </div>

                <div className="flex min-w-0 flex-col sm:items-end">
                  <span className="type-data-value text-sm tabular-nums">
                    {formatMoney(invoice.totalAmount, props.moneyProfile)}
                  </span>
                  <span className="type-data-label text-[10px] text-primary/70 transition-colors group-hover:text-primary">
                    Details -&gt;
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
