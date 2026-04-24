"use client";

import type { CurrentAssignment } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import { formatMoney } from "@/lib/money/format-money";
import {
  fetchOfficialDocumentProfile,
  officialDocumentProfileQueryKey,
} from "@/lib/react-query/official-documents";
import {
  fetchWorkerAssignments,
  workerAssignmentsQueryKey,
} from "@/lib/react-query/worker-assignments";
import { cn } from "@/lib/utils";

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
    queryFn: () => {
      if (!selectedLocationScope) {
        throw new Error("A stock location is required.");
      }
      return fetchWorkerAssignments(selectedLocationScope.locationId);
    },
    queryKey: workerAssignmentsQueryKey(
      selectedLocationScope?.locationId ?? "",
    ),
    staleTime: 30_000,
  });

  const items = stockQuery.data?.items ?? [];
  const profileQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () =>
      fetchOfficialDocumentProfile(selectedLocationScope?.locationId),
    queryKey: officialDocumentProfileQueryKey(
      selectedLocationScope?.locationId,
    ),
    staleTime: 5 * 60_000,
  });
  const moneyProfile = profileQuery.data ?? DEFAULT_OFFICIAL_DOCUMENT_PROFILE;

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
          moneyProfile={moneyProfile}
        />
      ) : null}
    </PageShell>
  );
}

function StockList({
  items,
  locationName,
  moneyProfile,
}: {
  items: CurrentAssignment[];
  locationName: string | undefined;
  moneyProfile: Parameters<typeof formatMoney>[1];
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 p-12 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <Package className="size-6 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium">No variants assigned</p>
        <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
          No variants are currently assigned to you
          {locationName ? ` at ${locationName}` : ""}.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {locationName ? (
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="rounded-lg bg-primary text-primary-foreground border-primary shadow-sm"
          >
            {items.length} variant{items.length !== 1 ? "s" : ""}
          </Badge>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">
            assigned at <span className="text-foreground">{locationName}</span>
          </p>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
        <div className="divide-y divide-border/50">
          {items.map((item) => (
            <StockRow
              key={item.skuId}
              item={item}
              moneyProfile={moneyProfile}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StockRow({
  item,
  moneyProfile,
}: {
  item: CurrentAssignment;
  moneyProfile: Parameters<typeof formatMoney>[1];
}) {
  const available = item.availableQuantity;
  const isOut = available === 0;
  const isLow = available > 0 && available <= 3;

  return (
    <div className="group relative flex flex-col gap-4 p-4 transition-colors hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-4">
      <div className="flex items-start gap-4">
        <ProductThumbnail
          className={cn(
            "size-12 shrink-0 rounded-xl transition-transform group-hover:scale-105",
            isOut && "ring-2 ring-destructive/20",
            isLow && "ring-2 ring-warning/20",
          )}
          imageUrl={item.primaryImageUrl}
          productName={item.productName}
          variantName={item.variantName}
        />
        <div className="min-w-0">
          <h4 className="truncate text-sm font-bold leading-tight group-hover:text-primary transition-colors">
            {item.productName}
          </h4>
          <p className="mt-1 truncate text-xs font-medium text-muted-foreground/80">
            {item.variantName}
          </p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/40">
            {item.sku}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 sm:gap-8">
        <div className="flex flex-col sm:items-end gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40">
            Price
          </span>
          <p className="text-sm font-bold tabular-nums">
            {formatMoney(item.sellingPrice, moneyProfile)}
          </p>
        </div>
        <div className="flex flex-col sm:items-end gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40">
            Assigned
          </span>
          <p className="text-sm font-bold tabular-nums text-muted-foreground">
            {item.quantity.toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col sm:items-end gap-0.5 min-w-[70px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40">
            Available
          </span>
          <p
            className={cn(
              "text-sm font-bold tabular-nums",
              isOut
                ? "text-destructive"
                : isLow
                  ? "text-warning-foreground"
                  : "text-success",
            )}
          >
            {available.toLocaleString()}
          </p>
        </div>
        <div className="flex sm:min-w-[80px] sm:justify-end">
          {isOut ? (
            <Badge className="bg-destructive text-destructive-foreground border-none rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm">
              Out
            </Badge>
          ) : isLow ? (
            <Badge className="bg-warning text-warning-foreground border-none rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm">
              Low
            </Badge>
          ) : (
            <Badge className="bg-success text-success-foreground border-none rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm">
              Good
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
