"use client";

import { Store } from "lucide-react";
import Link from "next/link";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MoneyProfile } from "@/lib/money/format-money";
import { formatMoney } from "@/lib/money/format-money";
import { toRoute } from "@/lib/routes";
import type { SalesLedgerLocationSummary } from "./sales-ledger-support";

export function SalesLedgerLocationPanel({
  items,
  moneyProfile,
}: {
  items: SalesLedgerLocationSummary[];
  moneyProfile: MoneyProfile;
}) {
  const visibleItems = items.slice(0, 6);

  if (items.length === 0) {
    return (
      <Card className="rounded-xl border border-border/50 shadow-sm">
        <CardContent className="p-0">
          <AppEmptyState
            description="No shop-level revenue has been recorded for the selected filters."
            icon={Store}
            title="No active shops"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border border-border/50 shadow-sm">
      <CardHeader className="border-b border-border/50">
        <CardTitle>Shop productivity</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col p-0">
        {visibleItems.map((item) => (
          <Link
            key={item.locationSlug}
            className="grid gap-3 p-4 transition-colors hover:bg-muted/30 md:grid-cols-[minmax(0,1fr)_8rem_9rem] md:items-center"
            href={toRoute(
              `/admin/locations/${encodeURIComponent(item.locationSlug)}`,
            )}
          >
            <div>
              <p className="type-data-value text-sm">{item.locationName}</p>
              <p className="type-support text-xs">View location</p>
            </div>
            <div className="md:text-right">
              <p className="type-data-label">Transactions</p>
              <p className="type-data-value text-sm tabular-nums">
                {item.transactionCount}
              </p>
            </div>
            <div className="md:text-right">
              <p className="type-data-label">Net revenue</p>
              <p className="type-data-value overflow-wrap-anywhere text-sm">
                {formatMoney(item.netRevenueAmount, moneyProfile)}
              </p>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
