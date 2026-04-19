"use client";

import type { CurrentAssignment } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  LayoutList,
  Package,
  Search,
  ShoppingCart,
  SquareStack,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { SupplyRequestDialog } from "@/components/worker/stock/supply-request-dialog";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import {
  fetchWorkerAssignments,
  workerAssignmentsQueryKey,
} from "@/lib/react-query/worker-assignments";

const SKELETON_KEYS = [1, 2, 3, 4, 5];

type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";
type ViewMode = "card" | "compact";

type SupplyTarget = {
  locationId: string;
  productName: string;
  sku: string;
  skuId: string;
  variantName: string;
};

function getStockStatus(available: number): "in_stock" | "low_stock" | "out_of_stock" {
  if (available === 0) return "out_of_stock";
  if (available <= 3) return "low_stock";
  return "in_stock";
}

export function WorkerAssignmentsPageClient() {
  const [supplyTarget, setSupplyTarget] = useState<SupplyTarget | null>(null);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("stock.assignments.own.view");

  const assignmentsQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () => fetchWorkerAssignments(selectedLocationScope!.locationId),
    queryKey: workerAssignmentsQueryKey(selectedLocationScope?.locationId ?? ""),
    staleTime: 30_000,
  });

  const allItems = assignmentsQuery.data?.items ?? [];

  const filteredItems = useMemo(() => {
    let result = allItems;

    if (stockFilter !== "all") {
      result = result.filter((item) => getStockStatus(item.availableQuantity) === stockFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (item) =>
          item.productName.toLowerCase().includes(q) ||
          item.variantName.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q),
      );
    }

    return result;
  }, [allItems, stockFilter, search]);

  const counts = useMemo(
    () => ({
      all: allItems.length,
      in_stock: allItems.filter((i) => getStockStatus(i.availableQuantity) === "in_stock").length,
      low_stock: allItems.filter((i) => getStockStatus(i.availableQuantity) === "low_stock").length,
      out_of_stock: allItems.filter((i) => getStockStatus(i.availableQuantity) === "out_of_stock").length,
    }),
    [allItems],
  );

  return (
    <PageShell>
      <PageHeader
        description="Product variants currently assigned to you at your location."
        title="My assignments"
      />

      <LocationScopePanel
        description="Assignments load from the location scope already attached to your access."
        emptyDescription="No assigned location is available for your worker assignment view."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Assignment location"
      />

      {assignmentsQuery.isPending && selectedLocationScope ? (
        <div className="flex flex-col gap-3">
          {SKELETON_KEYS.map((k) => (
            <Skeleton key={k} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : assignmentsQuery.isError ? (
        <AppErrorBanner
          detail="Could not load your assignments. Check the location ID and try again."
          error={assignmentsQuery.error}
          onRetry={() => void assignmentsQuery.refetch()}
          title="Unable to load assignments"
        />
      ) : selectedLocationScope ? (
        <AssignmentList
          allItems={allItems}
          counts={counts}
          filteredItems={filteredItems}
          locationName={
            assignmentsQuery.data?.locationName ||
            selectedLocationScope.locationName
          }
          search={search}
          stockFilter={stockFilter}
          viewMode={viewMode}
          locationId={selectedLocationScope.locationId}
          onRequestSupply={setSupplyTarget}
          onSearchChange={setSearch}
          onStockFilterChange={setStockFilter}
          onViewModeChange={setViewMode}
        />
      ) : null}

      <SupplyRequestDialog
        open={!!supplyTarget}
        target={supplyTarget}
        onOpenChange={(open) => { if (!open) setSupplyTarget(null); }}
      />
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// AssignmentList
// ---------------------------------------------------------------------------

type AssignmentListProps = {
  allItems: CurrentAssignment[];
  counts: Record<StockFilter, number>;
  filteredItems: CurrentAssignment[];
  locationId: string;
  locationName: string | undefined;
  search: string;
  stockFilter: StockFilter;
  viewMode: ViewMode;
  onRequestSupply: (target: SupplyTarget) => void;
  onSearchChange: (v: string) => void;
  onStockFilterChange: (v: StockFilter) => void;
  onViewModeChange: (v: ViewMode) => void;
};

const FILTER_OPTIONS: { label: string; value: StockFilter }[] = [
  { label: "All", value: "all" },
  { label: "In stock", value: "in_stock" },
  { label: "Low stock", value: "low_stock" },
  { label: "Out", value: "out_of_stock" },
];

function AssignmentList({
  allItems,
  counts,
  filteredItems,
  locationId,
  locationName,
  search,
  stockFilter,
  viewMode,
  onRequestSupply,
  onSearchChange,
  onStockFilterChange,
  onViewModeChange,
}: AssignmentListProps) {
  if (allItems.length === 0) {
    return (
      <AppEmptyState
        description={`No variants are assigned to you at ${locationName ?? "this location"}.`}
        icon={Package}
        kind="no-data"
        title="No assignments yet"
      />
    );
  }

  const hasActiveFilter = stockFilter !== "all" || search.trim() !== "";

  return (
    <div className="flex flex-col gap-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-2">
        {locationName ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{allItems.length}</span>{" "}
            variant{allItems.length !== 1 ? "s" : ""} at{" "}
            <span className="font-medium text-foreground">{locationName}</span>
          </p>
        ) : null}
        {counts.out_of_stock > 0 ? (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="size-3" />
            {counts.out_of_stock} out
          </Badge>
        ) : null}
        {counts.low_stock > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
            {counts.low_stock} low
          </span>
        ) : null}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-0 flex-1" style={{ minWidth: "160px" }}>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 pr-9"
            id="assignments-search"
            inputMode="search"
            placeholder="Search product, variant, SKU…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {search ? (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-ring"
              onClick={() => onSearchChange("")}
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        {/* Stock filter chips */}
        <div
          className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border bg-muted p-1"
          role="group"
          aria-label="Filter by stock status"
        >
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              id={`filter-${opt.value}`}
              aria-pressed={stockFilter === opt.value}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-ring",
                stockFilter === opt.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onStockFilterChange(opt.value)}
            >
              {opt.label}
              {counts[opt.value] > 0 ? (
                <span
                  className={cn(
                    "rounded px-1 text-[10px] tabular-nums",
                    stockFilter === opt.value ? "bg-muted text-muted-foreground" : "opacity-60",
                  )}
                >
                  {counts[opt.value]}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* View mode toggle */}
        <div
          className="flex items-center gap-1 rounded-lg border border-border bg-muted p-1"
          role="group"
          aria-label="Change view"
        >
          <button
            type="button"
            id="view-cards"
            aria-label="Card view"
            aria-pressed={viewMode === "card"}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:outline-ring",
              viewMode === "card"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onViewModeChange("card")}
          >
            <SquareStack className="size-4" />
          </button>
          <button
            type="button"
            id="view-compact"
            aria-label="Compact list view"
            aria-pressed={viewMode === "compact"}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:outline-ring",
              viewMode === "compact"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onViewModeChange("compact")}
          >
            <LayoutList className="size-4" />
          </button>
        </div>
      </div>

      {/* Results count when filtering */}
      {hasActiveFilter && (
        <p className="text-xs text-muted-foreground">
          {filteredItems.length === 0
            ? "No assignments match your filters."
            : `Showing ${filteredItems.length} of ${allItems.length}`}
        </p>
      )}

      {/* Item list */}
      {filteredItems.length === 0 ? (
        <AppEmptyState
          description="Try a different search term or stock filter."
          kind="no-results"
          title="No matching assignments"
          action={
            hasActiveFilter ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onSearchChange("");
                  onStockFilterChange("all");
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === "card" ? (
        <div className="flex flex-col gap-3">
          {filteredItems.map((item) => (
            <AssignmentCard
              key={item.skuId}
              item={item}
              onRequestSupply={() =>
                onRequestSupply({
                  locationId,
                  productName: item.productName,
                  sku: item.sku,
                  skuId: item.skuId,
                  variantName: item.variantName,
                })
              }
            />
          ))}
        </div>
      ) : (
        <CompactAssignmentList
          items={filteredItems}
          locationId={locationId}
          onRequestSupply={onRequestSupply}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card view
// ---------------------------------------------------------------------------

function AssignmentCard({
  item,
  onRequestSupply,
}: {
  item: CurrentAssignment;
  onRequestSupply: () => void;
}) {
  const available = item.availableQuantity;
  const status = getStockStatus(available);
  const isOut = status === "out_of_stock";
  const isLow = status === "low_stock";

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card shadow-sm",
        isOut ? "border-destructive/30" : isLow ? "border-amber-300/60" : "border-border",
      )}
    >
      {/* Status accent bar */}
      <div
        aria-hidden
        className={cn(
          "absolute left-0 top-0 h-full w-1",
          isOut ? "bg-destructive" : isLow ? "bg-amber-400" : "bg-emerald-400",
        )}
      />

      <div className="flex flex-col gap-4 pl-5 pr-4 pb-4 pt-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div
            aria-hidden
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-11 sm:w-11",
              isOut
                ? "bg-destructive/10 text-destructive"
                : isLow
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
                  : "bg-primary/10 text-primary",
            )}
          >
            <Package className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-snug">{item.productName}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{item.variantName}</p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">{item.sku}</p>
          </div>

          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
              isOut
                ? "bg-destructive/10 text-destructive"
                : isLow
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
            )}
          >
            {isOut ? "Out of stock" : isLow ? "Low stock" : "In stock"}
          </span>
        </div>

        {/* Stats — 3 columns on all sizes; min-width prevents squish */}
        <dl className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-lg border border-border bg-muted/30">
          <div className="px-2 py-2.5 text-center sm:px-3">
            <dt className="text-xs text-muted-foreground">Price</dt>
            <dd className="mt-1 truncate font-semibold tabular-nums text-sm">{item.sellingPrice}</dd>
          </div>
          <div className="px-2 py-2.5 text-center sm:px-3">
            <dt className="text-xs text-muted-foreground">Assigned</dt>
            <dd className="mt-1 font-semibold tabular-nums text-sm">{item.quantity}</dd>
          </div>
          <div className="px-2 py-2.5 text-center sm:px-3">
            <dt className="text-xs text-muted-foreground">Available</dt>
            <dd
              className={cn(
                "mt-1 font-semibold tabular-nums text-sm",
                isOut ? "text-destructive" : isLow ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {available}
            </dd>
          </div>
        </dl>

        {/* Action */}
        <Button
          className="w-full gap-2"
          size="lg"
          variant={isOut || isLow ? "default" : "outline"}
          onClick={onRequestSupply}
          id={`request-supply-${item.skuId}`}
          aria-label={`Request supply for ${item.productName} — ${item.variantName}`}
        >
          <ShoppingCart className="size-4" />
          Request supply
        </Button>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Compact list view — scales well for large lists on mobile
// ---------------------------------------------------------------------------

function CompactAssignmentList({
  items,
  locationId,
  onRequestSupply,
}: {
  items: CurrentAssignment[];
  locationId: string;
  onRequestSupply: (target: SupplyTarget) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {items.map((item, idx) => {
        const available = item.availableQuantity;
        const status = getStockStatus(available);
        const isOut = status === "out_of_stock";
        const isLow = status === "low_stock";

        return (
          <div
            key={item.skuId}
            className={cn(
              "relative flex items-center gap-3 px-4 py-3",
              idx !== items.length - 1 && "border-b border-border",
            )}
          >
            {/* Left accent */}
            <div
              aria-hidden
              className={cn(
                "absolute left-0 top-0 h-full w-0.5",
                isOut ? "bg-destructive" : isLow ? "bg-amber-400" : "bg-emerald-400",
              )}
            />

            {/* Product info */}
            <div className="min-w-0 flex-1 pl-1">
              <p className="truncate text-sm font-medium leading-tight">{item.productName}</p>
              <p className="truncate text-xs text-muted-foreground">{item.variantName}</p>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">{item.sku}</p>
            </div>

            {/* Inline stats */}
            <div className="hidden items-center gap-4 text-right sm:flex">
              <div>
                <p className="text-[10px] text-muted-foreground">Price</p>
                <p className="text-xs font-semibold tabular-nums">{item.sellingPrice}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Assigned</p>
                <p className="text-xs font-semibold tabular-nums">{item.quantity}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Available</p>
                <p
                  className={cn(
                    "text-xs font-semibold tabular-nums",
                    isOut ? "text-destructive" : isLow ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {available}
                </p>
              </div>
            </div>

            {/* Mobile: available qty inline badge */}
            <div className="flex items-center gap-2 sm:hidden">
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                  isOut
                    ? "bg-destructive/10 text-destructive"
                    : isLow
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30"
                      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30",
                )}
              >
                {available}
              </span>
            </div>

            {/* Action */}
            <Button
              className="shrink-0"
              variant={isOut || isLow ? "default" : "outline"}
              size="sm"
              id={`request-compact-${item.skuId}`}
              aria-label={`Request supply for ${item.productName} — ${item.variantName}`}
              onClick={() =>
                onRequestSupply({
                  locationId,
                  productName: item.productName,
                  sku: item.sku,
                  skuId: item.skuId,
                  variantName: item.variantName,
                })
              }
            >
              <ShoppingCart className="size-3.5" />
              <span className="hidden sm:inline">Request</span>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
