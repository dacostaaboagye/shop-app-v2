"use client";

import type { AdminStockBalanceSummary } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Search, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { buildStockBalanceColumns } from "@/components/admin/stock/stock-balance-columns";
import { StockCountDialog } from "@/components/admin/stock/stock-count-dialog";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { AppErrorBanner } from "@/components/system/app-error";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import {
  fetchManagerStockBalances,
  managerStockBalancesQueryKey,
  postManagerStockCount,
} from "@/lib/react-query/stock-admin";

const SKELETON_KEYS = [1, 2, 3, 4, 5, 6, 7, 8];

export function ManagerStockPageClient() {
  const queryClient = useQueryClient();
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("stock.view");

  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [countTarget, setCountTarget] =
    useState<AdminStockBalanceSummary | null>(null);
  const [countOpen, setCountOpen] = useState(false);

  const query = useMemo(
    () => ({
      locationId: selectedLocationScope?.locationId ?? "",
      page: 1,
      pageSize: 50,
      q: activeSearch,
    }),
    [selectedLocationScope?.locationId, activeSearch],
  );

  const stockQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () => fetchManagerStockBalances(query),
    queryKey: managerStockBalancesQueryKey(selectedLocationScope ? query : {}),
    staleTime: 30_000,
  });
  const countMutation = useMutation({
    mutationFn: postManagerStockCount,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["stock", "balances", "manager"],
      });
      setCountOpen(false);
      setCountTarget(null);
    },
  });

  const openCountDialog = useCallback(
    (row: AdminStockBalanceSummary | null) => {
      setCountTarget(row);
      countMutation.reset();
      setCountOpen(true);
    },
    [countMutation],
  );

  const canCount =
    selectedLocationScope?.permissions.includes("inventory.write") ?? false;
  const columns = useMemo(
    () => buildStockBalanceColumns(canCount ? openCountDialog : null),
    [canCount, openCountDialog],
  );
  const stockItems = stockQuery.data?.items ?? [];
  const totals = useMemo(
    () =>
      stockItems.reduce(
        (acc, item) => ({
          available: acc.available + item.availableQuantity,
          inTransit: acc.inTransit + item.inTransitQuantity,
          onHand: acc.onHand + item.onHandQuantity,
          reserved: acc.reserved + item.reservedQuantity,
        }),
        { available: 0, inTransit: 0, onHand: 0, reserved: 0 },
      ),
    [stockItems],
  );

  const handleSearch = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      setActiveSearch(search.trim());
    },
    [search],
  );

  return (
    <PageShell>
      <PageHeader
        actions={
          canCount ? (
            <Button
              onClick={() => openCountDialog(null)}
              size="sm"
              type="button"
              variant="outline"
            >
              <ClipboardList data-icon="inline-start" />
              Enter count
            </Button>
          ) : null
        }
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
          className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-white p-4 shadow-sm"
          onSubmit={handleSearch}
        >
          <div className="relative min-w-[320px] flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-11 border-0 bg-muted pl-10 transition-all focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product or SKU"
              value={search}
            />
          </div>
          <Button className="h-11 rounded-xl px-6" size="sm" type="submit">
            <Search className="size-3.5" data-icon="inline-start" />
            Search
          </Button>
          {activeSearch ? (
            <Button
              className="h-11 rounded-xl"
              onClick={() => {
                setSearch("");
                setActiveSearch("");
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <X className="size-3.5" data-icon="inline-start" />
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

      <AppTableWrapper>
        {stockQuery.isPending && selectedLocationScope ? (
          <div className="flex flex-col gap-1 p-4">
            {SKELETON_KEYS.map((k) => (
              <Skeleton key={k} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : stockQuery.isError ? (
          <div className="p-8">
            <AppErrorBanner
              detail="Could not load stock data for this location."
              error={stockQuery.error}
              onRetry={() => void stockQuery.refetch()}
              title="Unable to load stock"
            />
          </div>
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
      </AppTableWrapper>

      <StockCountDialog
        error={countMutation.error}
        isPending={countMutation.isPending}
        locationName={selectedLocationScope?.locationName ?? ""}
        locationSlug={selectedLocationScope?.locationSlug ?? ""}
        onOpenChange={(open) => {
          setCountOpen(open);
          if (!open) countMutation.reset();
        }}
        onSubmit={(req) => countMutation.mutate(req)}
        open={countOpen}
        row={countTarget}
      />
    </PageShell>
  );
}

function StockMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/50 bg-white px-4 py-3 shadow-sm shadow-black/2 transition-all hover:shadow-md">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
