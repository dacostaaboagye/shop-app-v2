"use client";

import { BarChart3 } from "lucide-react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MoneyProfile } from "@/lib/money/format-money";
import { formatMoney } from "@/lib/money/format-money";
import type { SalesLedgerDay } from "./sales-ledger-support";

export function SalesLedgerTimeline({
  days,
  moneyProfile,
}: {
  days: SalesLedgerDay[];
  moneyProfile: MoneyProfile;
}) {
  if (days.length === 0) {
    return (
      <Card className="rounded-xl border border-border/50 shadow-sm">
        <CardContent className="p-0">
          <AppEmptyState
            description="Adjust the filters to see sales movement across time."
            icon={BarChart3}
            title="No timeline data"
          />
        </CardContent>
      </Card>
    );
  }

  const maxGrossSales = Math.max(...days.map((day) => day.grossSalesAmount), 1);

  return (
    <Card className="rounded-xl border border-border/50 shadow-sm">
      <CardHeader className="border-b border-border/50">
        <CardTitle>Daily performance timeline</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-4">
        {days.map((day) => {
          const salesWidth = Math.max(
            8,
            (day.grossSalesAmount / maxGrossSales) * 100,
          );
          const creditWidth =
            day.creditNoteAmount > 0
              ? Math.max(4, (day.creditNoteAmount / maxGrossSales) * 100)
              : 0;

          return (
            <div
              key={day.dateKey}
              className="grid gap-3 rounded-xl border border-border/50 p-4 lg:grid-cols-[9rem_minmax(0,1fr)_9rem_7rem]"
            >
              <div className="min-w-0">
                <p className="type-data-label">{day.displayDate}</p>
                <p className="type-support text-xs">
                  {day.receiptCount} receipts, {day.creditNoteCount} credits
                </p>
              </div>

              <div className="flex min-w-0 flex-col justify-center gap-2">
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/85"
                    style={{ width: `${salesWidth}%` }}
                  />
                </div>
                {creditWidth > 0 ? (
                  <div className="h-2 overflow-hidden rounded-full bg-destructive/10">
                    <div
                      className="h-full rounded-full bg-destructive/80"
                      style={{ width: `${creditWidth}%` }}
                    />
                  </div>
                ) : (
                  <div className="h-2" />
                )}
              </div>

              <div className="min-w-0 lg:text-right">
                <p className="type-data-label">Net revenue</p>
                <p className="type-data-value overflow-wrap-anywhere text-base">
                  {formatMoney(day.netRevenueAmount, moneyProfile)}
                </p>
              </div>

              <div className="min-w-0 lg:text-right">
                <p className="type-data-label">Transactions</p>
                <p className="type-data-value text-base tabular-nums">
                  {day.transactionCount}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
