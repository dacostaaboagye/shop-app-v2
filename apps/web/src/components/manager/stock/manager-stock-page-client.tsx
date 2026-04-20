"use client";

import type { AdminStockBalanceSummary } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { buildStockBalanceColumns } from "@/components/admin/stock/stock-balance-columns";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
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

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setActiveSearch(search.trim());
  }

  return (
    <PageShell>
      <PageHeader
        description="On-hand, reserved, and available quantities at your managed location."
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
        <form className="flex items-center gap-2" onSubmit={handleSearch}>
          <Input
            className="max-w-xs"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product or SKU…"
            value={search}
          />
          <button
            className="rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent/40"
            type="submit"
          >
            Search
          </button>
          {activeSearch ? (
            <button
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSearch("");
                setActiveSearch("");
              }}
              type="button"
            >
              Clear
            </button>
          ) : null}
        </form>
      ) : null}

      {stockQuery.data ? (
        <p className="text-sm tabular-nums text-muted-foreground">
          {stockQuery.data.totalCount} SKU
          {stockQuery.data.totalCount !== 1 ? "s" : ""}
          {stockQuery.data.locationName
            ? ` at ${stockQuery.data.locationName}`
            : ""}
        </p>
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
          data={stockQuery.data?.items ?? []}
          density="compact"
          emptyDescription={
            selectedLocationScope
              ? "No stock entered yet at this location."
              : "Select a location above to load stock data."
          }
          emptyTitle="No stock data"
          getRowId={(row: AdminStockBalanceSummary) => row.skuId}
        />
      )}
    </PageShell>
  );
}
