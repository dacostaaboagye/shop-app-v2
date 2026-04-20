"use client";

import type { CurrentAssignment } from "@shop/contracts";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getStockStatus,
  type SupplyTarget,
} from "./worker-assignments-support";

export function CompactAssignmentList({
  items,
  locationId,
  locationName,
  onRequestSupply,
}: {
  items: CurrentAssignment[];
  locationId: string;
  locationName: string;
  onRequestSupply: (target: SupplyTarget) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {items.map((item, index) => (
        <CompactAssignmentRow
          item={item}
          key={item.skuId}
          locationId={locationId}
          locationName={locationName}
          onRequestSupply={onRequestSupply}
          showDivider={index !== items.length - 1}
        />
      ))}
    </div>
  );
}

function CompactAssignmentRow({
  item,
  locationId,
  locationName,
  onRequestSupply,
  showDivider,
}: {
  item: CurrentAssignment;
  locationId: string;
  locationName: string;
  onRequestSupply: (target: SupplyTarget) => void;
  showDivider: boolean;
}) {
  const status = getStockStatus(item.availableQuantity);
  const isOut = status === "out_of_stock";
  const isLow = status === "low_stock";

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 px-4 py-3",
        showDivider && "border-b border-border",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "absolute left-0 top-0 h-full w-0.5",
          isOut ? "bg-destructive" : isLow ? "bg-warning" : "bg-success",
        )}
      />
      <div className="min-w-0 flex-1 pl-1">
        <p className="truncate text-sm font-medium leading-tight">
          {item.productName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {item.variantName}
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">
          {item.sku}
        </p>
      </div>
      <div className="hidden items-center gap-4 text-right sm:flex">
        <InlineStat label="Price" value={item.sellingPrice} />
        <InlineStat
          label="On Hand"
          value={item.onHandQuantity.toLocaleString()}
        />
        <InlineStat
          label="Available"
          tone={isOut ? "danger" : isLow ? "warning" : "success"}
          value={item.availableQuantity.toLocaleString()}
        />
      </div>
      <span
        className={cn(
          "rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums sm:hidden",
          isOut
            ? "bg-destructive/10 text-destructive"
            : isLow
              ? "bg-warning/20 text-warning-foreground"
              : "bg-success/10 text-success",
        )}
      >
        {item.availableQuantity.toLocaleString()}
      </span>
      <Button
        aria-label={`Request supply for ${item.productName} - ${item.variantName}`}
        className="shrink-0"
        id={`request-compact-${item.skuId}`}
        onClick={() =>
          onRequestSupply({
            locationId,
            locationName,
            productName: item.productName,
            sku: item.sku,
            skuId: item.skuId,
            variantName: item.variantName,
          })
        }
        size="sm"
        variant={isOut || isLow ? "default" : "outline"}
      >
        <ShoppingCart data-icon="inline-start" />
        <span className="hidden sm:inline">Request</span>
      </Button>
    </div>
  );
}

function InlineStat({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "danger" | "success" | "warning";
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={cn("text-xs font-semibold tabular-nums", toneClass(tone))}>
        {value}
      </p>
    </div>
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
