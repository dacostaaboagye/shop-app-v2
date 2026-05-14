"use client";

import type { StockSupplyRequestResponse } from "@shop/contracts";
import { Search } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import {
  StockWorkspaceError,
  StockWorkspaceSplitSkeleton,
} from "@/components/stock/stock-workspace-feedback";
import {
  TransferLanePicker,
  TransferQueueItemCard,
} from "@/components/stock/transfer-workspace-surfaces";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TransferLane } from "./transfer-workspace.support";

export function TransferWorkspaceShell({
  detail,
  emptyDescription,
  emptyTitle = "No transfers in this lane",
  isLoading,
  items,
  laneCounts,
  laneDescription,
  lanes,
  laneTitle = "Transfer lanes",
  onLaneChange,
  onRetry,
  onSearchChange,
  onSelect,
  queryError,
  queueDescription,
  queryState,
  queueTitle = "Transfer queue",
  search,
  selectedLane,
  selectedItem,
  selectedTransferId,
}: {
  detail?: ReactNode;
  emptyDescription: string;
  emptyTitle?: string;
  isLoading: boolean;
  items: readonly StockSupplyRequestResponse[];
  laneCounts: Record<string, number>;
  laneDescription?: string;
  lanes: readonly TransferLane[];
  laneTitle?: string;
  onLaneChange: (value: string) => void;
  onRetry: () => void;
  onSearchChange: (value: string) => void;
  onSelect: (value: string) => void;
  queryError: Error | null;
  queryState: "error" | "pending" | "success";
  queueDescription?: string;
  queueTitle?: string;
  search: string;
  selectedLane: string;
  selectedItem: StockSupplyRequestResponse | null;
  selectedTransferId: string | null;
}) {
  useEffect(() => {
    if (!selectedItem && items[0]) {
      onSelect(items[0].supplyRequestId);
    }
  }, [items, onSelect, selectedItem]);

  if (queryState === "pending" || isLoading) {
    return <StockWorkspaceSplitSkeleton />;
  }

  if (queryState === "error") {
    return (
      <StockWorkspaceError
        detail="Could not load transfers for this workspace."
        error={queryError}
        onRetry={onRetry}
        title="Unable to load transfers"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start">
          <div className="min-w-0">
            <h2 className="type-section-title text-xl text-foreground">
              {laneTitle}
            </h2>
            {laneDescription ? (
              <p className="type-support mt-1 max-w-3xl">{laneDescription}</p>
            ) : null}
          </div>
          <div className="relative w-full min-w-0">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-11 pl-9"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search transfers..."
              value={search}
            />
          </div>
        </div>
        <div className="mt-4">
          <TransferLanePicker
            laneCounts={laneCounts}
            lanes={lanes}
            onLaneChange={onLaneChange}
            selectedLane={selectedLane}
          />
        </div>
      </section>

      {items.length === 0 ? (
        <AppEmptyState description={emptyDescription} title={emptyTitle} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(17rem,20rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
          <aside className="h-fit rounded-lg border border-border/60 bg-card p-4 shadow-sm xl:sticky xl:top-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="type-section-title text-lg text-foreground">
                  {queueTitle}
                </h2>
                {queueDescription ? (
                  <p className="type-support mt-1">{queueDescription}</p>
                ) : null}
              </div>
              {queueDescription ? (
                <span className="type-inline-metric rounded-lg border border-border/60 bg-muted/25 px-2 py-1 text-xs text-foreground">
                  {items.length}
                </span>
              ) : null}
            </div>
            <div
              className={cn(
                "flex flex-col gap-2",
                items.length > 6 &&
                  "xl:max-h-[calc(100vh-12rem)] xl:overflow-y-auto xl:pr-1",
              )}
            >
              {items.map((item) => (
                <TransferQueueItemCard
                  isSelected={item.supplyRequestId === selectedTransferId}
                  key={item.supplyRequestId}
                  item={item}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </aside>

          <div className="flex flex-col gap-4">{detail}</div>
        </div>
      )}
    </div>
  );
}