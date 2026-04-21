"use client";

import type { CurrentAssignment } from "@shop/contracts";
import { ShoppingCart } from "lucide-react";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
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
        "relative overflow-hidden rounded-xl border bg-card shadow-sm",
        isOut
          ? "border-destructive/30"
          : isLow
            ? "border-warning/40"
            : "border-border",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "absolute left-0 top-0 h-full w-1",
          isOut ? "bg-destructive" : isLow ? "bg-warning" : "bg-success",
        )}
      />
      <div className="flex flex-col gap-4 pb-4 pl-5 pr-4 pt-4">
        <AssignmentHeader item={item} isLow={isLow} isOut={isOut} />
        <AssignmentStats
          item={item}
          isLow={isLow}
          isOut={isOut}
          moneyProfile={moneyProfile}
        />
        <Button
          aria-label={`Request supply for ${item.productName} - ${item.variantName}`}
          className="w-full gap-2"
          id={`request-supply-${item.skuId}`}
          onClick={onRequestSupply}
          size="lg"
          variant={isOut || isLow ? "default" : "outline"}
        >
          <ShoppingCart data-icon="inline-start" />
          Request supply
        </Button>
      </div>
    </article>
  );
}

function AssignmentHeader({
  isLow,
  isOut,
  item,
}: {
  isLow: boolean;
  isOut: boolean;
  item: CurrentAssignment;
}) {
  return (
    <div className="flex items-start gap-3">
      <ProductThumbnail
        className={cn(
          "size-10 shrink-0 sm:size-11",
          isOut && "ring-destructive/30",
          isLow && "ring-warning/40",
        )}
        imageUrl={item.primaryImageUrl}
        productName={item.productName}
        variantName={item.variantName}
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-snug">{item.productName}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {item.variantName}
        </p>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
          {item.sku}
        </p>
      </div>
      <StockPill
        available={item.availableQuantity}
        isLow={isLow}
        isOut={isOut}
      />
    </div>
  );
}

function AssignmentStats({
  isLow,
  isOut,
  item,
  moneyProfile,
}: {
  isLow: boolean;
  isOut: boolean;
  item: CurrentAssignment;
  moneyProfile: MoneyProfile;
}) {
  return (
    <dl className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-lg border border-border bg-muted/30">
      <StatCell
        label="Price"
        value={formatMoney(item.sellingPrice, moneyProfile)}
      />
      <StatCell label="On Hand" value={item.onHandQuantity.toLocaleString()} />
      <StatCell
        label="Available"
        tone={isOut ? "danger" : isLow ? "warning" : "success"}
        value={item.availableQuantity.toLocaleString()}
      />
    </dl>
  );
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
    <div className="px-2 py-2.5 text-center sm:px-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 truncate text-sm font-semibold tabular-nums",
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
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
        isOut
          ? "bg-destructive/10 text-destructive"
          : isLow
            ? "bg-warning/20 text-warning-foreground"
            : "bg-success/10 text-success",
      )}
    >
      {isOut ? "Out of stock" : isLow ? "Low stock" : "In stock"}
    </span>
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
