"use client";

import { BarChart3 } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MoneyProfile } from "@/lib/money/format-money";
import { formatMoney } from "@/lib/money/format-money";
import type { SalesLedgerDay } from "../sales/sales-ledger-support";

export function WorkerSalesPerformanceChart({
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
            description="The chart will appear here once the location has enough recent sales activity."
            icon={BarChart3}
            title="No chart data yet"
          />
        </CardContent>
      </Card>
    );
  }

  const data = days.map((day) => ({
    displayDate: day.displayDate,
    grossSalesAmount: day.grossSalesAmount,
    netRevenueAmount: day.netRevenueAmount,
    returnsAmount: day.creditNoteAmount > 0 ? -day.creditNoteAmount : 0,
    transactionCount: day.transactionCount,
  }));

  return (
    <Card className="rounded-xl border border-border/50 shadow-sm">
      <CardHeader className="border-b border-border/50">
        <CardTitle>7-day sales movement</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ bottom: 0, left: 0, right: 12, top: 12 }}
            >
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                axisLine={false}
                dataKey="displayDate"
                tickLine={false}
                tickMargin={10}
              />
              <YAxis
                axisLine={false}
                tickFormatter={(value: number) =>
                  formatCompactMoney(value, moneyProfile)
                }
                tickLine={false}
                tickMargin={10}
                width={82}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) {
                    return null;
                  }

                  const row = payload[0]?.payload as
                    | {
                        grossSalesAmount: number;
                        netRevenueAmount: number;
                        returnsAmount: number;
                        transactionCount: number;
                      }
                    | undefined;

                  if (!row) {
                    return null;
                  }

                  return (
                    <div className="min-w-56 rounded-xl border border-border/60 bg-background p-4 shadow-lg">
                      <p className="type-data-value text-sm">{label}</p>
                      <div className="mt-3 flex flex-col gap-2">
                        <ChartTooltipRow
                          label="Net revenue"
                          value={formatMoney(
                            row.netRevenueAmount,
                            moneyProfile,
                          )}
                        />
                        <ChartTooltipRow
                          label="Gross receipts"
                          value={formatMoney(
                            row.grossSalesAmount,
                            moneyProfile,
                          )}
                        />
                        <ChartTooltipRow
                          label="Credits issued"
                          value={formatMoney(
                            Math.abs(row.returnsAmount),
                            moneyProfile,
                          )}
                        />
                        <ChartTooltipRow
                          label="Transactions"
                          value={String(row.transactionCount)}
                        />
                      </div>
                    </div>
                  );
                }}
              />
              <ReferenceLine stroke="var(--muted-foreground)" y={0} />
              <Bar
                barSize={20}
                dataKey="returnsAmount"
                fill="var(--destructive)"
                radius={[8, 8, 8, 8]}
              />
              <Line
                dataKey="grossSalesAmount"
                dot={{ fill: "var(--color-chart-2)", r: 3 }}
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                type="monotone"
              />
              <Line
                dataKey="netRevenueAmount"
                dot={{ fill: "var(--color-chart-1)", r: 4 }}
                stroke="var(--color-chart-1)"
                strokeWidth={3}
                type="monotone"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartTooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="type-support text-xs">{label}</span>
      <span className="type-data-value text-xs">{value}</span>
    </div>
  );
}

function formatCompactMoney(value: number, profile: MoneyProfile) {
  const absoluteValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const currencyPrefix = profile.currencyCode;

  if (absoluteValue >= 1_000_000) {
    return `${sign}${currencyPrefix} ${(absoluteValue / 1_000_000).toFixed(1)}M`;
  }

  if (absoluteValue >= 1_000) {
    return `${sign}${currencyPrefix} ${(absoluteValue / 1_000).toFixed(1)}K`;
  }

  return `${sign}${currencyPrefix} ${absoluteValue.toFixed(0)}`;
}
