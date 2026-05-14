"use client";

import type {
  WorkerHandoverLane,
  WorkerHandoverLaneCounts,
  WorkerHandoverSummary,
} from "@shop/contracts";
import { HandCoins, RotateCcw, Search } from "lucide-react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCount, formatDateTime } from "@/lib/display/format";
import { cn } from "@/lib/utils";
import type { HandoverLaneDefinition } from "./worker-handovers-support";

export function HandoverLaneControls({
  counts,
  lanes,
  onLaneChange,
  onSearchChange,
  search,
  selectedLane,
}: {
  counts: WorkerHandoverLaneCounts;
  lanes: readonly HandoverLaneDefinition[];
  onLaneChange: (lane: WorkerHandoverLane) => void;
  onSearchChange: (value: string) => void;
  search: string;
  selectedLane: WorkerHandoverLane;
}) {
  return (
    <section className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <div className="min-w-0">
          <h2 className="type-section-title text-xl text-foreground">
            Handover lanes
          </h2>
          <p className="type-support mt-1">
            Separate active received stock, stock given out, reversions, and
            older custody history.
          </p>
        </div>
        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 pl-9"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search handovers..."
            value={search}
          />
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {lanes.map((lane) => {
          const isSelected = selectedLane === lane.key;
          return (
            <button
              className={cn(
                "flex min-h-24 flex-col items-start justify-between gap-3 rounded-lg border p-3 text-left transition-colors",
                isSelected
                  ? "border-primary bg-primary/5 text-foreground ring-2 ring-primary/15"
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
    </section>
  );
}

export function HandoverQueue({
  items,
  onSelect,
  selectedId,
}: {
  items: readonly WorkerHandoverSummary[];
  onSelect: (chainId: string) => void;
  selectedId: string | null;
}) {
  if (items.length === 0) {
    return (
      <AppEmptyState
        description="No handovers match the selected lane or search."
        icon={HandCoins}
        kind="no-results"
        title="No handovers here"
      />
    );
  }

  return (
    <aside className="h-fit rounded-lg border border-border/60 bg-card p-4 shadow-sm xl:sticky xl:top-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="type-section-title text-lg text-foreground">Queue</h2>
        <span className="type-inline-metric rounded-lg border border-border/60 bg-muted/25 px-2 py-1 text-xs">
          {formatCount(items.length)}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <button
            className={cn(
              "flex gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary/50",
              item.handoverChainId === selectedId
                ? "border-primary bg-primary/5 ring-2 ring-primary/15"
                : "border-border bg-background",
            )}
            key={item.handoverChainId}
            onClick={() => onSelect(item.handoverChainId)}
            type="button"
          >
            <ProductThumbnail
              className="size-10 shrink-0 rounded-lg"
              imageUrl={item.primaryImageUrl}
              productName={item.productName}
              variantName={item.variantName}
            />
            <span className="min-w-0 flex-1">
              <span className="type-data-value block text-sm">
                {item.productName}
              </span>
              <span className="type-support block truncate text-xs">
                {item.variantName} - {item.sku}
              </span>
              <span className="type-support block text-xs">
                {formatCount(item.quantity)} units
              </span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

export function HandoverDetail({
  item,
  onRevert,
  revertPending,
}: {
  item: WorkerHandoverSummary | null;
  onRevert: (item: WorkerHandoverSummary) => void;
  revertPending: boolean;
}) {
  if (!item) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="border border-border/60 bg-card shadow-sm">
        <CardHeader className="gap-1">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-4">
              <ProductThumbnail
                className="size-16 shrink-0 rounded-xl"
                imageUrl={item.primaryImageUrl}
                productName={item.productName}
                variantName={item.variantName}
              />
              <div className="min-w-0">
                <CardTitle className="type-section-title text-xl text-foreground">
                  {item.productName}
                </CardTitle>
                <p className="type-support mt-1">
                  {item.variantName} - {item.sku}
                </p>
              </div>
            </div>
            <Badge variant={item.canRevert ? "default" : "outline"}>
              {handoverStatusLabel(item)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DetailStat label="Quantity" value={formatCount(item.quantity)} />
            <DetailStat label="From" value={item.fromWorkerName} />
            <DetailStat label="To" value={item.toWorkerName} />
            <DetailStat label="Current" value={item.currentWorkerName} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailStat
              label="Started"
              value={formatDateTime(item.startedAt)}
            />
            <DetailStat
              label="Latest event"
              value={formatDateTime(item.updatedAt)}
            />
          </div>
          {item.canRevert ? (
            <Button
              className="w-full gap-2 sm:w-fit"
              disabled={revertPending}
              onClick={() => onRevert(item)}
              type="button"
              variant="outline"
            >
              <RotateCcw className="size-4" />
              {revertPending ? "Reverting..." : "Revert handover"}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <p className="type-data-label">{label}</p>
      <p className="type-data-value mt-1 text-sm">{value}</p>
    </div>
  );
}

function handoverStatusLabel(item: WorkerHandoverSummary) {
  switch (item.lane) {
    case "active_received":
      return "With you";
    case "active_given":
      return "Given out";
    case "reverted":
      return "Reverted";
    case "history":
      return "History";
  }
}
