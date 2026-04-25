"use client";

import type { StockSupplyRequestResponse } from "@shop/contracts";
import { Search } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { TransferLane } from "./transfer-workspace.support";

export function TransferWorkspaceShell({
  detail,
  emptyDescription,
  isLoading,
  items,
  lanes,
  onLaneChange,
  onRetry,
  onSearchChange,
  onSelect,
  queryError,
  queryState,
  search,
  selectedLane,
  selectedItem,
  selectedTransferId,
}: {
  detail?: ReactNode;
  emptyDescription: string;
  isLoading: boolean;
  items: readonly StockSupplyRequestResponse[];
  lanes: readonly TransferLane[];
  onLaneChange: (value: string) => void;
  onRetry: () => void;
  onSearchChange: (value: string) => void;
  onSelect: (value: string) => void;
  queryError: Error | null;
  queryState: "error" | "pending" | "success";
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
    return <TransferWorkspaceSkeleton />;
  }

  if (queryState === "error") {
    return (
      <AppErrorBanner
        detail="Could not load transfers for this workspace."
        error={queryError}
        onRetry={onRetry}
        title="Unable to load transfers"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="border border-border/50 bg-white shadow-sm">
        <CardHeader className="gap-3">
          <CardTitle>Transfer lanes</CardTitle>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
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
          <div className="flex flex-wrap gap-2">
            {lanes.map((lane) => (
              <button
                className="min-h-11 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-left transition hover:border-border hover:bg-muted/30 data-[active=true]:border-border data-[active=true]:bg-white"
                data-active={lane.key === selectedLane}
                key={lane.key}
                onClick={() => onLaneChange(lane.key)}
                type="button"
              >
                <span className="flex flex-col items-start text-left">
                  <span className="text-sm font-semibold text-foreground">
                    {lane.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {lane.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <AppEmptyState
          description={emptyDescription}
          title="No transfers in this lane"
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="border border-border/50 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Transfer queue</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {items.map((item) => (
                <button
                  className="rounded-xl border border-border/60 px-4 py-3 text-left transition hover:border-border hover:bg-muted/20 data-[active=true]:border-primary/40 data-[active=true]:bg-primary/5"
                  data-active={item.supplyRequestId === selectedTransferId}
                  key={item.supplyRequestId}
                  onClick={() => onSelect(item.supplyRequestId)}
                  type="button"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-xs text-muted-foreground">
                        {item.transferReference ?? item.reference}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.status}
                      </p>
                    </div>
                    <p className="font-medium text-foreground">
                      {item.skuSnapshot.productName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.sourceLocationName ?? "Source"} {" -> "}{" "}
                      {item.locationName ?? "Destination"}
                    </p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">{detail}</div>
        </div>
      )}
    </div>
  );
}

function TransferWorkspaceSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Skeleton className="h-[560px] rounded-xl" />
      <Skeleton className="h-[560px] rounded-xl" />
    </div>
  );
}
