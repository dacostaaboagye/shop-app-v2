"use client";

import type { StockSupplyRequestResponse } from "@shop/contracts";
import { ArrowRight, Package } from "lucide-react";
import { getSupplyRequestStatusPresentation } from "@/components/stock/stock-status";
import type { TransferLane } from "@/components/stock/transfer-workspace.support";
import {
  formatCount,
  formatPublicReference,
  formatSupportText,
} from "@/lib/display/format";
import { cn } from "@/lib/utils";

export function TransferLanePicker({
  laneCounts,
  lanes,
  onLaneChange,
  selectedLane,
}: {
  laneCounts: Record<string, number>;
  lanes: readonly TransferLane[];
  onLaneChange: (value: string) => void;
  selectedLane: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
      {lanes.map((lane) => {
        const isActive = lane.key === selectedLane;
        const count = laneCounts[lane.key] ?? 0;

        return (
          <button
            className="min-h-14 min-w-0 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-left transition hover:border-border hover:bg-muted/30 data-[active=true]:border-primary/40 data-[active=true]:bg-primary/5 data-[active=true]:shadow-sm sm:min-h-20"
            data-active={isActive}
            key={lane.key}
            onClick={() => onLaneChange(lane.key)}
            type="button"
          >
            <span className="grid gap-2">
              <span className="flex items-start justify-between gap-3">
                <span className="type-data-value text-sm">{lane.label}</span>
                <span className="type-inline-metric rounded-lg border border-border/60 bg-card px-2 py-0.5 text-xs text-foreground">
                  {formatCount(count)}
                </span>
              </span>
              <span className="type-support hidden text-xs sm:line-clamp-2">
                {lane.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function TransferQueueItemCard({
  isSelected,
  item,
  onSelect,
}: {
  isSelected: boolean;
  item: StockSupplyRequestResponse;
  onSelect: (value: string) => void;
}) {
  const status = getSupplyRequestStatusPresentation(item.status);
  const quantity = item.approvedQuantity ?? item.requestedQuantity;

  return (
    <button
      className="rounded-lg border border-border/60 bg-background/50 px-3 py-3 text-left transition hover:border-border hover:bg-muted/20 data-[active=true]:border-primary/40 data-[active=true]:bg-primary/5 data-[active=true]:shadow-sm"
      data-active={isSelected}
      onClick={() => onSelect(item.supplyRequestId)}
      type="button"
    >
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="type-identifier min-w-0">
            {formatPublicReference(item.transferReference ?? item.reference)}
          </p>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
              status.accent.badge,
            )}
          >
            {status.label}
          </span>
        </div>
        <div className="flex min-w-0 gap-2.5">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Package className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="overflow-wrap-anywhere font-medium leading-snug text-foreground">
              {item.skuSnapshot.productName}
            </p>
            <p className="type-support mt-0.5 text-xs">
              {item.skuSnapshot.variantName}
            </p>
          </div>
        </div>
        <dl className="grid gap-2 rounded-lg bg-muted/25 p-2.5 text-xs">
          <div className="flex min-w-0 items-center gap-1.5">
            <dt className="type-data-label shrink-0 text-muted-foreground">
              Route
            </dt>
            <dd className="flex min-w-0 items-center gap-1 text-muted-foreground">
              <span className="truncate">
                {formatSupportText(item.sourceLocationName, "Source")}
              </span>
              <ArrowRight className="size-3 shrink-0" />
              <span className="truncate">
                {formatSupportText(item.locationName, "Destination")}
              </span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="type-data-label text-muted-foreground">Quantity</dt>
            <dd className="type-inline-metric text-sm text-foreground">
              {formatCount(quantity)}
            </dd>
          </div>
        </dl>
      </div>
    </button>
  );
}