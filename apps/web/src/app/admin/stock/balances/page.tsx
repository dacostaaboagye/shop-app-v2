"use client";

import type { AdminStockBalanceSummary } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Search, X } from "lucide-react";
import { useId, useState } from "react";
import { buildStockBalanceColumns } from "@/components/admin/stock/stock-balance-columns";
import { StockCountDialog } from "@/components/admin/stock/stock-count-dialog";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminLocationsQueryKey,
  fetchAdminLocations,
} from "@/lib/react-query/admin-directory";
import {
  fetchStockBalances,
  postStockCount,
  stockBalancesQueryKey,
} from "@/lib/react-query/stock-admin";
import {
  getStockBalanceLocationName,
  STOCK_BALANCE_LOCATIONS_QUERY,
  STOCK_BALANCE_SKELETON_KEYS,
  type StockBalanceFilter,
} from "./page.support";

export default function StockBalancesPage() {
  const { can } = useAuthorization();
  const locationSelectId = useId();
  const searchId = useId();
  const queryClient = useQueryClient();
  const [locationSlug, setLocationSlug] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockBalanceFilter | null>(null);
  const [countTarget, setCountTarget] =
    useState<AdminStockBalanceSummary | null>(null);
  const [countOpen, setCountOpen] = useState(false);

  const canCount = can("inventory.write");
  const locationsQuery = useQuery({
    queryFn: () => fetchAdminLocations(STOCK_BALANCE_LOCATIONS_QUERY),
    queryKey: adminLocationsQueryKey(STOCK_BALANCE_LOCATIONS_QUERY),
    staleTime: 60_000,
  });

  const stockQuery = useQuery({
    enabled: !!filter,
    queryFn: async () => {
      if (!filter) throw new Error("A location is required.");
      return fetchStockBalances({
        locationSlug: filter.locationSlug,
        page: 1,
        pageSize: 50,
        q: filter.q,
      });
    },
    queryKey: stockBalancesQueryKey(
      filter
        ? {
            locationSlug: filter.locationSlug,
            page: 1,
            pageSize: 50,
            q: filter.q,
          }
        : {},
    ),
  });
  const countMutation = useMutation({
    mutationFn: postStockCount,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        exact: false,
        queryKey: ["stock", "balances"],
      });
      setCountOpen(false);
      setCountTarget(null);
    },
  });
  function handleLocationChange(slug: string) {
    setLocationSlug(slug);
    setFilter(slug ? { locationSlug: slug, q: search.trim() } : null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!locationSlug) return;
    setFilter({ locationSlug, q: search.trim() });
  }

  function handleClear() {
    setLocationSlug("");
    setSearch("");
    setFilter(null);
  }

  function openCountDialog(row: AdminStockBalanceSummary | null) {
    setCountTarget(row);
    countMutation.reset();
    setCountOpen(true);
  }
  const locationName = getStockBalanceLocationName(
    locationSlug,
    stockQuery.data?.locationName,
    locationsQuery.data?.items,
  );

  const columns = buildStockBalanceColumns(
    canCount ? (row) => openCountDialog(row) : null,
  );
  return (
    <PageShell>
      <PageHeader
        actions={
          canCount ? (
            <Button
              disabled={!locationSlug}
              onClick={() => openCountDialog(null)}
              size="sm"
              type="button"
              variant="outline"
            >
              <ClipboardList className="size-3.5" />
              Enter count
            </Button>
          ) : null
        }
        description="On-hand, reserved, and available quantities by location."
        title="Stock levels"
      />

      <form
        className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-3"
        onSubmit={handleSubmit}
      >
        <div className="flex min-w-52 flex-1 flex-col gap-1.5">
          <Label htmlFor={locationSelectId}>Location</Label>
          <Select
            id={locationSelectId}
            onChange={(e) => handleLocationChange(e.target.value)}
            required
            value={locationSlug}
          >
            <option value="">
              {locationsQuery.isPending
                ? "Loading locations…"
                : "Select a location"}
            </option>
            {locationsQuery.data?.items.map((loc) => (
              <option key={loc.slug} value={loc.slug}>
                {loc.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex min-w-52 flex-1 flex-col gap-1.5">
          <Label htmlFor={searchId}>Search (optional)</Label>
          <Input
            id={searchId}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Product name or SKU"
            value={search}
          />
        </div>
        <div className="flex gap-2">
          <Button disabled={!locationSlug} size="sm" type="submit">
            <Search className="size-3.5" />
            Query
          </Button>
          {filter ? (
            <Button
              onClick={handleClear}
              size="sm"
              type="button"
              variant="outline"
            >
              <X className="size-3.5" />
              Clear
            </Button>
          ) : null}
        </div>
      </form>

      {stockQuery.data ? (
        <p className="text-sm tabular-nums text-muted-foreground">
          {stockQuery.data.totalCount} SKU
          {stockQuery.data.totalCount !== 1 ? "s" : ""}
          {stockQuery.data.locationName
            ? ` at ${stockQuery.data.locationName}`
            : ""}
        </p>
      ) : null}

      {stockQuery.isFetching && !stockQuery.data ? (
        <div className="flex flex-col gap-2">
          {STOCK_BALANCE_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-10 w-full" />
          ))}
        </div>
      ) : stockQuery.isError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {stockQuery.error instanceof Error
            ? stockQuery.error.message
            : "Failed to load stock levels."}
        </p>
      ) : (
        <AppDataTable
          columns={columns}
          data={stockQuery.data?.items ?? []}
          density="compact"
          emptyDescription={
            filter
              ? "No stock entered yet — use Enter count above to add the first SKU."
              : "Select a location above to load stock data."
          }
          emptyTitle="No stock data"
          getRowId={(row) => row.skuId}
        />
      )}

      <StockCountDialog
        error={countMutation.error}
        isPending={countMutation.isPending}
        locationName={locationName}
        locationSlug={locationSlug}
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
