"use client";

import type { StockSupplyRequestResponse } from "@shop/contracts";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { statusMeta } from "@/components/manager/stock/manager-supply-requests.support";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatPublicReference } from "@/lib/display/format";
import { formatMoney, type MoneyProfile } from "@/lib/money/format-money";
import { toRoute } from "@/lib/routes";

const PANEL_SKELETON_KEYS = [1, 2, 3] as const;

type ManagerSaleItem = {
  createdAt: string;
  reference: string;
  totalAmount: string;
  type: string;
};

export function ManagerDashboardSalesPanel(props: {
  canViewSales: boolean;
  isPending: boolean;
  items: readonly ManagerSaleItem[];
  moneyProfile: MoneyProfile;
}) {
  return (
    <Card className="border-border/70 bg-card shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Recent sales</CardTitle>
      </CardHeader>
      <CardContent>
        {!props.canViewSales ? (
          <AppEmptyState
            description="Sales visibility is not enabled for this location scope."
            kind="no-data"
            title="Sales not enabled"
          />
        ) : props.isPending ? (
          <div className="flex flex-col gap-3">
            {PANEL_SKELETON_KEYS.map((key) => (
              <Skeleton key={key} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : props.items.length ? (
          <div className="flex flex-col gap-3">
            {props.items.map((item) => (
              <Link
                className="group rounded-xl border border-border/60 bg-muted/25 p-4 transition-all hover:border-border hover:bg-card hover:shadow-sm"
                href={toRoute(
                  `/manager/sales/${encodeURIComponent(item.reference)}`,
                )}
                key={item.reference}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="type-data-value">
                        {formatPublicReference(item.reference)}
                      </p>
                      <p className="type-support text-xs">
                        {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                      <span>Open sale</span>
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="min-w-0 rounded-lg border border-border/50 bg-background/70 p-3">
                      <p className="type-kicker text-muted-foreground">Type</p>
                      <p className="type-data-value mt-2 overflow-wrap-anywhere break-words">
                        {item.type === "credit_note" ? "Credit note" : "Sale"}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-lg border border-border/50 bg-background/70 p-3">
                      <p className="type-kicker text-muted-foreground">Total</p>
                      <p className="type-data-value mt-2 overflow-wrap-anywhere break-words">
                        {formatMoney(item.totalAmount, props.moneyProfile)}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <AppEmptyState
            description="Sales recorded for the selected location will appear here."
            kind="no-data"
            title="No sales recorded today"
          />
        )}
      </CardContent>
    </Card>
  );
}

export function ManagerDashboardTransferPanel(props: {
  error: Error | null;
  isError: boolean;
  isPending: boolean;
  items: readonly StockSupplyRequestResponse[];
  onRetry: () => void;
}) {
  return (
    <Card className="border-border/70 bg-card shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Active transfers</CardTitle>
      </CardHeader>
      <CardContent>
        {props.isPending ? (
          <div className="flex flex-col gap-3">
            {PANEL_SKELETON_KEYS.map((key) => (
              <Skeleton key={key} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : props.isError ? (
          <AppErrorBanner
            detail="Could not load transfer work."
            error={props.error}
            onRetry={props.onRetry}
            title="Unable to load transfers"
          />
        ) : props.items.length ? (
          <div className="flex flex-col gap-3">
            {props.items.map((item) => {
              const presentation = statusMeta(item.status);

              return (
                <article
                  className="rounded-xl border border-border/60 bg-muted/25 p-4"
                  key={item.supplyRequestId}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="type-data-value">
                        {formatPublicReference(
                          item.transferReference ?? item.reference,
                        )}
                      </p>
                      <p className="type-support">
                        {item.skuSnapshot.productName} -{" "}
                        {item.skuSnapshot.variantName}
                      </p>
                      <p className="type-support text-xs">
                        {item.requesterName} - {item.sourceLocationName}
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-1 text-xs text-muted-foreground md:items-end">
                      <span>{presentation.label}</span>
                      <span>{formatDateTime(item.createdAt)}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <AppEmptyState
            description="Open transfer work for this location will appear here."
            kind="no-data"
            title="No active transfers"
          />
        )}
      </CardContent>
    </Card>
  );
}
