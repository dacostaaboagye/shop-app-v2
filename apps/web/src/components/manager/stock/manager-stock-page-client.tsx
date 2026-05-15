"use client";

import type { AdminStockBalanceSummary } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { buildStockBalanceColumns } from "@/components/admin/stock/stock-balance-columns";
import {
  ManagerBulkSupplyDialogSection,
  ManagerOpeningStockSetup,
  ManagerStockCountDialogSection,
  ManagerStockMetrics,
  ManagerStockTableSection,
} from "@/components/manager/stock/manager-stock-page-sections";
import { StockSearchToolbar } from "@/components/stock/stock-workspace-panels";
import { useStockWriteOffDialog } from "@/components/stock/use-stock-write-off-dialog";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";
import type { SupplyRequestTarget } from "@/components/worker/stock/supply-request-dialog.types";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import {
  fetchManagerStockBalances,
  managerStockBalancesQueryKey,
  postManagerOpeningStock,
  postManagerStockCount,
} from "@/lib/react-query/stock-admin";
import { postManagerStockWriteOff } from "@/lib/react-query/stock-write-offs";

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
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestTargets, setRequestTargets] = useState<SupplyRequestTarget[]>(
    [],
  );
  const [openingResetKey, setOpeningResetKey] = useState(0);

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
  const openingStockMutation = useMutation({
    mutationFn: postManagerOpeningStock,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["stock", "balances", "manager"],
      });
      setOpeningResetKey((key) => key + 1);
    },
  });
  const { openWriteOffDialog, writeOffDialog } = useStockWriteOffDialog({
    invalidateQueryKeys: [
      ["stock", "balances", "manager"],
      ["stock", "movements"],
    ],
    locationSlug: selectedLocationScope?.locationSlug ?? "",
    mutationFn: postManagerStockWriteOff,
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
  const canRequestSupply =
    selectedLocationScope?.permissions.includes("stock.supply.manage") ?? false;
  const columns = useMemo(
    () =>
      buildStockBalanceColumns(
        canCount ? openCountDialog : null,
        canCount ? openWriteOffDialog : null,
      ),
    [canCount, openCountDialog, openWriteOffDialog],
  );
  const stockItems = stockQuery.data?.items ?? [];

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
          openingStockMutation.reset();
          setSelectedLocationSlug(slug);
          setSearch("");
          setActiveSearch("");
        }}
        selectedLocationSlug={selectedLocationSlug}
        title="Managed location"
      />

      {selectedLocationScope ? (
        <StockSearchToolbar
          activeSearch={activeSearch}
          onClear={() => {
            setSearch("");
            setActiveSearch("");
          }}
          onSearchChange={setSearch}
          onSubmit={handleSearch}
          placeholder="Search by product or SKU"
          search={search}
        />
      ) : null}

      <ManagerOpeningStockSetup
        canCount={canCount}
        error={openingStockMutation.error}
        isPending={openingStockMutation.isPending}
        location={selectedLocationScope}
        onSubmit={(req) => {
          openingStockMutation.reset();
          openingStockMutation.mutate(req);
        }}
        resetKey={openingResetKey}
        success={openingStockMutation.data}
      />

      {stockQuery.data ? (
        <ManagerStockMetrics
          items={stockItems}
          totalCount={stockQuery.data.totalCount}
        />
      ) : null}

      <ManagerStockTableSection
        canRequestSupply={canRequestSupply}
        columns={columns}
        error={stockQuery.error}
        isError={stockQuery.isError}
        isPending={stockQuery.isPending}
        items={stockItems}
        location={selectedLocationScope}
        onOpenSupplyRequest={(targets) => {
          setRequestTargets(targets);
          setRequestOpen(true);
        }}
        onRetry={() => void stockQuery.refetch()}
      />

      <ManagerStockCountDialogSection
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
      {writeOffDialog}
      <ManagerBulkSupplyDialogSection
        onOpenChange={(open) => {
          setRequestOpen(open);
          if (!open) {
            setRequestTargets([]);
          }
        }}
        open={requestOpen}
        targets={requestTargets}
      />
    </PageShell>
  );
}
