"use client";

import type { StockSupplyRequestResponse } from "@shop/contracts";
import { getSupplyRequestStatusPresentation } from "@/components/stock/stock-status";
import type { TransferLane } from "@/components/stock/transfer-workspace.support";
import {
  formatCount,
  formatPublicReference,
  formatSupportText,
} from "@/lib/display/format";

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
    <div className="flex flex-wrap gap-2">
      {lanes.map((lane) => {
        const isActive = lane.key === selectedLane;
        const count = laneCounts[lane.key] ?? 0;

        return (
          <button
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-left transition hover:border-border hover:bg-muted/30 data-[active=true]:border-primary/30 data-[active=true]:bg-primary/5 sm:flex-none"
            data-active={isActive}
            key={lane.key}
            onClick={() => onLaneChange(lane.key)}
            type="button"
          >
            <span className="flex items-start justify-between gap-3">
              <span className="flex flex-col items-start text-left">
                <span className="type-data-value text-sm">{lane.label}</span>
                <span className="type-support text-xs">{lane.description}</span>
              </span>
              <span className="type-inline-metric rounded-lg border border-border/60 bg-card px-2 py-0.5 text-xs text-foreground">
                {formatCount(count)}
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
      className="rounded-xl border border-border/60 px-4 py-3 text-left transition hover:border-border hover:bg-muted/20 data-[active=true]:border-primary/40 data-[active=true]:bg-primary/5"
      data-active={isSelected}
      onClick={() => onSelect(item.supplyRequestId)}
      type="button"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="type-identifier min-w-0">
            {formatPublicReference(item.transferReference ?? item.reference)}
          </p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${status.accent.badge}`}
          >
            {status.label}
          </span>
        </div>
        <p className="overflow-wrap-anywhere font-medium text-foreground">
          {item.skuSnapshot.productName}
        </p>
        <p className="type-support text-xs">{item.skuSnapshot.variantName}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-1">
            <p className="type-data-label text-muted-foreground">Route</p>
            <p className="type-support text-xs">
              {formatSupportText(item.sourceLocationName, "Source")} {" -> "}{" "}
              {formatSupportText(item.locationName, "Destination")}
            </p>
          </div>
          <div className="grid gap-1 text-left sm:text-right">
            <p className="type-data-label text-muted-foreground">Qty</p>
            <p className="type-inline-metric text-sm text-foreground">
              {formatCount(quantity)}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}
