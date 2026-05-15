"use client";

import type {
  ManagerHandoverLane,
  ManagerHandoverLaneCounts,
  ManagerHandoverSummary,
} from "@shop/contracts";
import { HandCoins, RotateCcw } from "lucide-react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCount, formatDateTime } from "@/lib/display/format";
import { cn } from "@/lib/utils";
import {
  filterManagerHandovers,
  formatManagerHandoverStatus,
  managerHandoverLanes,
} from "./manager-handovers-support";

export function ManagerHandoverOversightPanel({
  counts,
  items,
  locationName,
  onLaneChange,
  onRevert,
  revertingChainId,
  selectedLane,
}: {
  counts: ManagerHandoverLaneCounts;
  items: readonly ManagerHandoverSummary[];
  locationName: string | undefined;
  onLaneChange: (lane: ManagerHandoverLane) => void;
  onRevert: (item: ManagerHandoverSummary) => void;
  revertingChainId: string | null;
  selectedLane: ManagerHandoverLane;
}) {
  const filteredItems = filterManagerHandovers({ items, lane: selectedLane });

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="type-section-title text-xl text-foreground">
            Handover oversight
          </h2>
          <p className="type-support mt-1">
            Active custody changes for {locationName ?? "this location"}.
          </p>
        </div>
        <Badge className="w-fit rounded-md" variant="secondary">
          {formatCount(items.length)} total
        </Badge>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {managerHandoverLanes.map((lane) => {
          const isSelected = selectedLane === lane.key;
          return (
            <button
              className={cn(
                "flex min-h-20 flex-col items-start justify-between gap-2 rounded-lg border p-3 text-left transition-colors",
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/15"
                  : "border-border bg-muted/20 hover:border-primary/50",
              )}
              key={lane.key}
              onClick={() => onLaneChange(lane.key)}
              type="button"
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="type-data-value text-sm">{lane.label}</span>
                <Badge variant={isSelected ? "default" : "outline"}>
                  {formatCount(counts[lane.key])}
                </Badge>
              </span>
              <span className="type-support text-xs">{lane.description}</span>
            </button>
          );
        })}
      </div>

      {filteredItems.length === 0 ? (
        <AppEmptyState
          description="No handovers match this lane."
          icon={HandCoins}
          kind="no-results"
          title="No handovers here"
        />
      ) : (
        <div className="grid gap-3">
          {filteredItems.map((item) => (
            <ManagerHandoverRow
              item={item}
              key={item.handoverChainId}
              onRevert={onRevert}
              reverting={revertingChainId === item.handoverChainId}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ManagerHandoverRow({
  item,
  onRevert,
  reverting,
}: {
  item: ManagerHandoverSummary;
  onRevert: (item: ManagerHandoverSummary) => void;
  reverting: boolean;
}) {
  return (
    <article className="grid gap-4 rounded-lg border border-border/60 bg-background p-4 md:grid-cols-[minmax(0,1.3fr)_minmax(16rem,0.9fr)_auto] md:items-center">
      <div className="flex min-w-0 gap-4">
        <ProductThumbnail
          className="size-14 shrink-0 rounded-lg"
          imageUrl={item.primaryImageUrl}
          productName={item.productName}
          variantName={item.variantName}
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="type-data-value text-balance">{item.productName}</h3>
            <Badge variant={item.canRevert ? "default" : "outline"}>
              {formatManagerHandoverStatus(item)}
            </Badge>
          </div>
          <p className="type-support mt-1 text-pretty">
            {item.variantName} - {item.sku}
          </p>
          <p className="type-identifier mt-1 break-all">
            {formatCount(item.quantity)} units
          </p>
        </div>
      </div>

      <div className="grid gap-2 text-sm">
        <WorkerLine label="From" value={item.fromWorkerName} />
        <WorkerLine label="To" value={item.toWorkerName} />
        <WorkerLine label="Current" value={item.currentWorkerName} />
        <p className="type-support text-xs">
          Started {formatDateTime(item.startedAt)}. Latest{" "}
          {formatDateTime(item.updatedAt)}.
        </p>
      </div>

      {item.canRevert ? (
        <Button
          className="w-full gap-2 md:w-fit"
          disabled={reverting}
          onClick={() => onRevert(item)}
          type="button"
          variant="outline"
        >
          <RotateCcw className="size-4" />
          {reverting ? "Reverting..." : "Revert"}
        </Button>
      ) : null}
    </article>
  );
}

function WorkerLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] gap-2">
      <span className="type-data-label">{label}</span>
      <span className="type-data-value truncate text-sm">{value}</span>
    </p>
  );
}
