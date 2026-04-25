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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
      <Card className="border border-border/50 bg-card shadow-sm">
        <CardHeader className="gap-3">
          <CardTitle className="type-section-title text-xl text-foreground">
            {laneTitle}
          </CardTitle>
          {laneDescription ? (
            <p className="type-support">{laneDescription}</p>
          ) : null}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full min-w-0 lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search transfers..."
                value={search}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <TransferLanePicker
            laneCounts={laneCounts}
            lanes={lanes}
            onLaneChange={onLaneChange}
            selectedLane={selectedLane}
          />
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <AppEmptyState description={emptyDescription} title={emptyTitle} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(18rem,22.5rem)_minmax(0,1fr)]">
          <Card className="border border-border/50 bg-card shadow-sm">
            <CardHeader className="gap-2">
              <CardTitle className="type-section-title text-xl text-foreground">
                {queueTitle}
              </CardTitle>
              {queueDescription ? (
                <p className="type-support">
                  {queueDescription}{" "}
                  {items.length > 0 ? `(${items.length})` : ""}
                </p>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {items.map((item) => (
                <TransferQueueItemCard
                  isSelected={item.supplyRequestId === selectedTransferId}
                  key={item.supplyRequestId}
                  item={item}
                  onSelect={onSelect}
                />
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">{detail}</div>
        </div>
      )}
    </div>
  );
}
