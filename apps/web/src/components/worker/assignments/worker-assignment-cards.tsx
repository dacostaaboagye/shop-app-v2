"use client";

import type { CurrentAssignment } from "@shop/contracts";
import { ShoppingCart } from "lucide-react";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, type MoneyProfile } from "@/lib/money/format-money";
import { cn } from "@/lib/utils";
import { getStockStatus } from "./worker-assignments-support";

export function AssignmentCard({
  item,
  moneyProfile,
  onRequestSupply,
}: {
  item: CurrentAssignment;
  moneyProfile: MoneyProfile;
  onRequestSupply: () => void;
}) {
  const status = getStockStatus(item.availableQuantity);
  const isOut = status === "out_of_stock";
  const isLow = status === "low_stock";

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md",
      )}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="relative">
              <ProductThumbnail
                className={cn(
                  "size-12 shrink-0 rounded-xl transition-transform group-hover:scale-105 sm:size-14",
                  isOut && "ring-2 ring-destructive/20",
                  isLow && "ring-2 ring-warning/20",
                )}
                imageUrl={item.primaryImageUrl}
                productName={item.productName}
                variantName={item.variantName}
              />
              {inCartIndicator(item.skuId)}
            </div>
            <div className="min-w-0">
              <h3 className="font-heading text-base font-bold leading-tight group-hover:text-primary transition-colors">
                {item.productName}
              </h3>
              <p className="mt-1 truncate text-sm text-muted-foreground/80 font-medium">
                {item.variantName}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/50">
                {item.sku}
              </p>
            </div>
          </div>
          <StockPill
            available={item.availableQuantity}
            isLow={isLow}
            isOut={isOut}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatCell
            label="Price"
            value={formatMoney(item.sellingPrice, moneyProfile)}
          />
          <StatCell
            label="On Hand"
            value={item.onHandQuantity.toLocaleString()}
          />
          <StatCell
            label="Available"
            tone={isOut ? "danger" : isLow ? "warning" : "success"}
            value={item.availableQuantity.toLocaleString()}
          />
        </div>

        <Button
          aria-label={`Request supply for ${item.productName} - ${item.variantName}`}
          className="h-11 w-full rounded-xl gap-2 font-bold transition-all active:scale-[0.98]"
          id={`request-supply-${item.skuId}`}
          onClick={onRequestSupply}
          variant={isOut || isLow ? "default" : "outline"}
        >
          <ShoppingCart className="size-4" />
          Request Supply
        </Button>
      </div>
    </article>
  );
}

// Helper for consistency in redesign, placeholder for now
function inCartIndicator(_skuId: string) {
  return null;
}

function StatCell({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "danger" | "success" | "warning";
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-white px-3 py-2.5 ring-1 ring-border shadow-sm">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
        {label}
      </dt>
      <dd
        className={cn(
          "truncate text-sm font-bold tabular-nums",
          toneClass(tone),
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function StockPill({
  isLow,
  isOut,
}: {
  available: number;
  isLow: boolean;
  isOut: boolean;
}) {
  return (
    <Badge
      className={cn(
        "shrink-0 rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm border-none",
        isOut
          ? "bg-destructive text-destructive-foreground"
          : isLow
            ? "bg-warning text-warning-foreground"
            : "bg-success text-success-foreground",
      )}
    >
      {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
    </Badge>
  );
}

function toneClass(tone: "danger" | "success" | "warning" | undefined) {
  switch (tone) {
    case "danger":
      return "text-destructive";
    case "success":
      return "text-success";
    case "warning":
      return "text-warning-foreground";
    default:
      return "";
  }
}
