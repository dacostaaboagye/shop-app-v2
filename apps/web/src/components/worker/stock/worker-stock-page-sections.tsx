"use client";

import type { CurrentAssignment } from "@shop/contracts";
import { Package } from "lucide-react";
import { StockMetricGrid } from "@/components/stock/stock-workspace-panels";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { Badge } from "@/components/ui/badge";
import { formatCount } from "@/lib/display/format";
import { formatMoney } from "@/lib/money/format-money";
import { cn } from "@/lib/utils";

export function StockList({
  items,
  locationName,
  moneyProfile,
}: {
  items: CurrentAssignment[];
  locationName: string | undefined;
  moneyProfile: Parameters<typeof formatMoney>[1];
}) {
  const totalAssigned = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAvailable = items.reduce(
    (sum, item) => sum + item.availableQuantity,
    0,
  );

  if (items.length === 0) {
    return (
      <AppEmptyState
        description={`No variants are currently assigned to you${locationName ? ` at ${locationName}` : ""}.`}
        icon={Package}
        title="No variants assigned"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <StockMetricGrid
        items={[
          { label: "Variants", value: items.length },
          { label: "Assigned", value: totalAssigned },
          { label: "Available", value: totalAvailable },
        ]}
      />
      {locationName ? (
        <div className="flex items-center gap-2">
          <Badge
            className="rounded-lg border-primary/20 bg-primary/10 text-primary shadow-none"
            variant="outline"
          >
            {formatCount(items.length)} variant{items.length !== 1 ? "s" : ""}
          </Badge>
          <p className="type-support">
            Assigned at{" "}
            <span className="font-medium text-foreground">{locationName}</span>
          </p>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
        <div className="divide-y divide-border/50">
          {items.map((item) => (
            <StockRow
              key={item.skuId}
              item={item}
              moneyProfile={moneyProfile}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StockRow({
  item,
  moneyProfile,
}: {
  item: CurrentAssignment;
  moneyProfile: Parameters<typeof formatMoney>[1];
}) {
  const available = item.availableQuantity;
  const isOut = available === 0;
  const isLow = available > 0 && available <= 3;

  return (
    <div className="group relative flex flex-col gap-4 p-4 transition-colors hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-4">
      <div className="flex items-start gap-4">
        <ProductThumbnail
          className={cn(
            "size-12 shrink-0 rounded-xl transition-transform group-hover:scale-105",
            isOut && "ring-2 ring-destructive/20",
            isLow && "ring-2 ring-warning/20",
          )}
          imageUrl={item.primaryImageUrl}
          productName={item.productName}
          variantName={item.variantName}
        />
        <div className="min-w-0">
          <h4 className="text-balance text-sm font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
            {item.productName}
          </h4>
          <p className="type-support mt-1 text-pretty">{item.variantName}</p>
          <p className="type-identifier mt-1 break-all text-muted-foreground">
            {item.sku}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 sm:gap-8">
        <div className="flex flex-col gap-0.5 sm:items-end">
          <span className="type-data-label text-muted-foreground">Price</span>
          <p className="text-sm font-bold tabular-nums">
            {formatMoney(item.sellingPrice, moneyProfile)}
          </p>
        </div>
        <div className="flex flex-col gap-0.5 sm:items-end">
          <span className="type-data-label text-muted-foreground">
            Assigned
          </span>
          <p className="text-sm font-bold tabular-nums text-muted-foreground">
            {formatCount(item.quantity)}
          </p>
        </div>
        <div className="flex min-w-[70px] flex-col gap-0.5 sm:items-end">
          <span className="type-data-label text-muted-foreground">
            Available
          </span>
          <p
            className={cn(
              "text-sm font-bold tabular-nums",
              isOut
                ? "text-destructive"
                : isLow
                  ? "text-warning-foreground"
                  : "text-success",
            )}
          >
            {formatCount(available)}
          </p>
        </div>
        <div className="flex sm:min-w-[80px] sm:justify-end">
          {isOut ? (
            <Badge className="rounded-lg border-none bg-destructive px-2 py-0.5 text-[10px] font-semibold text-destructive-foreground shadow-sm">
              Out
            </Badge>
          ) : isLow ? (
            <Badge className="rounded-lg border-none bg-warning px-2 py-0.5 text-[10px] font-semibold text-warning-foreground shadow-sm">
              Low
            </Badge>
          ) : (
            <Badge className="rounded-lg border-none bg-success px-2 py-0.5 text-[10px] font-semibold text-success-foreground shadow-sm">
              Good
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
