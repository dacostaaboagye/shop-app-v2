"use client";

import type { CurrentAssignment } from "@shop/contracts";
import { Check, ShoppingCart } from "lucide-react";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/display/format";
import { formatMoney, type MoneyProfile } from "@/lib/money/format-money";
import { cn } from "@/lib/utils";
import {
  getStockStatus,
  type SupplyTarget,
} from "./worker-assignments-support";

export function CompactAssignmentList({
  items,
  locationId,
  locationName,
  moneyProfile,
  onSelectSupply,
  onRequestSupply,
  selectedSupplySkuIds = [],
}: {
  items: CurrentAssignment[];
  locationId: string;
  locationName: string;
  moneyProfile: MoneyProfile;
  onSelectSupply: ((target: SupplyTarget) => void) | undefined;
  onRequestSupply: (target: SupplyTarget) => void;
  selectedSupplySkuIds?: string[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
      <div className="hidden border-b border-border/50 bg-muted px-4 py-3 sm:grid sm:grid-cols-[1fr_120px_100px_100px_120px] sm:gap-4">
        <span className="type-data-label">Product</span>
        <span className="type-data-label text-right">Price</span>
        <span className="type-data-label text-right">On Hand</span>
        <span className="type-data-label text-right">Available</span>
        <span className="type-data-label text-right">Actions</span>
      </div>
      <div className="divide-y divide-border/50">
        {items.map((item) => (
          <CompactAssignmentRow
            item={item}
            key={item.skuId}
            locationId={locationId}
            locationName={locationName}
            moneyProfile={moneyProfile}
            onSelectSupply={onSelectSupply}
            onRequestSupply={onRequestSupply}
            selectedForSupply={selectedSupplySkuIds.includes(item.skuId)}
          />
        ))}
      </div>
    </div>
  );
}

function CompactAssignmentRow({
  item,
  locationId,
  locationName,
  moneyProfile,
  onSelectSupply,
  onRequestSupply,
  selectedForSupply,
}: {
  item: CurrentAssignment;
  locationId: string;
  locationName: string;
  moneyProfile: MoneyProfile;
  onSelectSupply: ((target: SupplyTarget) => void) | undefined;
  onRequestSupply: (target: SupplyTarget) => void;
  selectedForSupply: boolean;
}) {
  const status = getStockStatus(item.availableQuantity);
  const isOut = status === "out_of_stock";
  const isLow = status === "low_stock";

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-4 p-4 transition-colors hover:bg-muted sm:grid sm:grid-cols-[1fr_120px_100px_100px_120px] sm:items-center sm:gap-4 sm:py-3",
        selectedForSupply && "bg-primary/5",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <ProductThumbnail
          className="size-10 shrink-0 rounded-lg sm:size-9"
          imageUrl={item.primaryImageUrl}
          productName={item.productName}
          variantName={item.variantName}
        />
        <div className="min-w-0 flex-1">
          <p className="type-data-value text-balance text-sm leading-tight transition-colors group-hover:text-primary">
            {item.productName}
          </p>
          <p className="type-support text-pretty text-[11px]">
            {item.variantName}
          </p>
          <p className="type-identifier mt-0.5 break-all text-[9px]">
            {item.sku}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:contents">
        <div className="flex flex-col sm:items-end">
          <span className="type-data-label sm:hidden">Price</span>
          <p className="text-sm font-bold tabular-nums">
            {formatMoney(item.sellingPrice, moneyProfile)}
          </p>
        </div>
        <div className="flex flex-col sm:items-end">
          <span className="type-data-label sm:hidden">On Hand</span>
          <p className="text-sm font-bold tabular-nums">
            {formatCount(item.onHandQuantity)}
          </p>
        </div>
        <div className="flex flex-col sm:items-end">
          <span className="type-data-label sm:hidden">Available</span>
          <p
            className={cn(
              "text-sm font-bold tabular-nums",
              toneClass(isOut ? "danger" : isLow ? "warning" : "success"),
            )}
          >
            {formatCount(item.availableQuantity)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button
            aria-label={`Request supply for ${item.productName} - ${item.variantName}`}
            className="h-8 w-full rounded-lg gap-2 px-3 text-xs font-bold sm:w-auto"
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
            variant={isOut || isLow ? "default" : "outline"}
          >
            <ShoppingCart className="size-3" />
            <span className="sm:hidden lg:inline">Request</span>
          </Button>
          {onSelectSupply ? (
            <Button
              className="h-8 w-full rounded-lg gap-2 px-3 text-xs font-bold sm:w-auto"
              onClick={() =>
                onSelectSupply({
                  locationId,
                  locationName,
                  productName: item.productName,
                  sku: item.sku,
                  skuId: item.skuId,
                  variantName: item.variantName,
                })
              }
              type="button"
              variant={selectedForSupply ? "default" : "outline"}
            >
              <Check className="size-3" />
              <span className="sm:hidden lg:inline">
                {selectedForSupply ? "Selected" : "Select"}
              </span>
            </Button>
          ) : null}
        </div>
      </div>
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
