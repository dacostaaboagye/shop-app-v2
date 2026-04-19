"use client";

import type { CurrentAssignment } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import {
  fetchWorkerAssignments,
  workerAssignmentsQueryKey,
} from "@/lib/react-query/worker-assignments";

const SKELETON_KEYS = [1, 2, 3, 4, 5, 6, 7, 8];

export function WorkerStockPageClient() {
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("stock.assignments.own.view");

  const stockQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () => fetchWorkerAssignments(selectedLocationScope!.locationId),
    queryKey: workerAssignmentsQueryKey(selectedLocationScope?.locationId ?? ""),
    staleTime: 30_000,
  });

  const items = stockQuery.data?.items ?? [];

  return (
    <PageShell>
      <PageHeader
        description="Product variants currently assigned to you at your location."
        title="My stock"
      />

      <LocationScopePanel
        description="Stock loads from the location scope already attached to your worker access."
        emptyDescription="No assigned location is available for your stock view."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={(slug) => {
          setSelectedLocationSlug(slug);
        }}
        selectedLocationSlug={selectedLocationSlug}
        title="Stock location"
      />

      {stockQuery.isPending && selectedLocationScope ? (
        <div className="flex flex-col gap-2">
          {SKELETON_KEYS.map((k) => (
            <Skeleton key={k} className="h-14 w-full" />
          ))}
        </div>
      ) : stockQuery.isError ? (
        <AppErrorBanner
          detail="Could not load your assigned stock."
          error={stockQuery.error}
          onRetry={() => void stockQuery.refetch()}
          title="Unable to load stock"
        />
      ) : selectedLocationScope ? (
        <StockList
          items={items}
          locationName={
            stockQuery.data?.locationName || selectedLocationScope.locationName
          }
        />
      ) : null}
    </PageShell>
  );
}

function StockList({
  items,
  locationName,
}: {
  items: CurrentAssignment[];
  locationName: string | undefined;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No variants are currently assigned to you
        {locationName ? ` at ${locationName}` : ""}.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {locationName ? (
        <p className="text-sm text-muted-foreground">
          {items.length} variant{items.length !== 1 ? "s" : ""} assigned at{" "}
          <span className="font-medium text-foreground">{locationName}</span>
        </p>
      ) : null}
      <div className="divide-y divide-border rounded-md border border-border bg-card">
        {items.map((item) => (
          <StockRow key={item.skuId} item={item} />
        ))}
      </div>
    </div>
  );
}

function StockRow({ item }: { item: CurrentAssignment }) {
  const available = item.availableQuantity;
  const isLow = available > 0 && available <= 3;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Package className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="font-medium leading-none">{item.productName}</p>
          <p className="mt-1 text-sm text-muted-foreground">{item.variantName}</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{item.sku}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Price</p>
          <p className="font-medium tabular-nums">{item.sellingPrice}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Assigned</p>
          <p className="font-medium tabular-nums">{item.quantity}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Available</p>
          <p
            className={`font-medium tabular-nums ${available === 0 ? "text-destructive" : isLow ? "text-warning" : "text-foreground"}`}
          >
            {available}
          </p>
        </div>
        {available === 0 ? (
          <Badge variant="destructive">Out</Badge>
        ) : isLow ? (
          <Badge variant="outline" className="border-warning/50 text-warning">
            Low
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
