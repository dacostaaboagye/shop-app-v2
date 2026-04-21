"use client";

import type { AdminStockBalanceSummary } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useState } from "react";
import { buildStockBalanceColumns } from "@/components/admin/stock/stock-balance-columns";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import {
  fetchManagerStockBalances,
  managerStockBalancesQueryKey,
} from "@/lib/react-query/stock-admin";

const SKELETON_KEYS = [1, 2, 3, 4, 5, 6, 7, 8];

export function ManagerStockPageClient() {
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("stock.view");

  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const query = {
    locationId: selectedLocationScope?.locationId ?? "",
    page: 1,
    pageSize: 50,
    q: activeSearch,
  };

  const stockQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () => fetchManagerStockBalances(query),
    queryKey: managerStockBalancesQueryKey(selectedLocationScope ? query : {}),
    staleTime: 30_000,
  });

  const columns = buildStockBalanceColumns(null);
  const stockItems = stockQuery.data?.items ?? [];
  const totals = stockItems.reduce(
    (acc, item) => ({
      available: acc.available + item.availableQuantity,
      inTransit: acc.inTransit + item.inTransitQuantity,
      onHand: acc.onHand + item.onHandQuantity,
      reserved: acc.reserved + item.reservedQuantity,
    }),
    { available: 0, inTransit: 0, onHand: 0, reserved: 0 },
  );

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setActiveSearch(search.trim());
  }

  return (
    <PageShell>
      <PageHeader
        description="On-hand, reserved, available, and in-transit quantities at your managed location."
        title="Stock levels"
      />

      <LocationScopePanel
        description="Stock visibility follows the location scopes already linked to your manager access."
        emptyDescription="No managed location is available for stock visibility."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={(slug) => {
          setSelectedLocationSlug(slug);
          setSearch("");
          setActiveSearch("");
        }}
        selectedLocationSlug={selectedLocationSlug}
        title="Managed location"
      />

      {selectedLocationScope ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={handleSearch}
        >
          <Input
            className="max-w-xs"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product or SKU"
            value={search}
          />
          <Button size="sm" type="submit">
            <Search className="size-3.5" />
            Search
          </Button>
          {activeSearch ? (
            <Button
              onClick={() => {
                setSearch("");
                setActiveSearch("");
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <X className="size-3.5" />
              Clear
            </Button>
          ) : null}
        </form>
      ) : null}

      {stockQuery.data ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <StockMetric label="SKUs" value={stockQuery.data.totalCount} />
          <StockMetric label="On hand" value={totals.onHand} />
          <StockMetric label="Reserved" value={totals.reserved} />
          <StockMetric label="Available" value={totals.available} />
          <StockMetric label="In transit" value={totals.inTransit} />
        </div>
      ) : null}

      {stockQuery.isPending && selectedLocationScope ? (
        <div className="flex flex-col gap-2">
          {SKELETON_KEYS.map((k) => (
            <Skeleton key={k} className="h-10 w-full" />
          ))}
        </div>
      ) : stockQuery.isError ? (
        <AppErrorBanner
          detail="Could not load stock data for this location."
          error={stockQuery.error}
          onRetry={() => void stockQuery.refetch()}
          title="Unable to load stock"
        />
      ) : (
        <AppDataTable
          columns={columns}
          data={stockItems}
          density="compact"
          emptyDescription={
            selectedLocationScope
              ? "No stock entered or in transit yet at this location."
              : "Select a location above to load stock data."
          }
          emptyTitle="No stock data"
          getRowId={(row: AdminStockBalanceSummary) => row.skuId}
        />
      )}
    </PageShell>
  );
}

function StockMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
