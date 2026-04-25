"use client";

import type { StockSupplyRequestResponse } from "@shop/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AdminTransferActions,
  type AdminTransferOverrideAction,
} from "@/components/admin/stock/admin-transfer-actions";
import { AdminTransferOverrideDialog } from "@/components/admin/stock/admin-transfer-override-dialog";
import { ActionDialog } from "@/components/manager/stock/manager-supply-request-action-dialog";
import {
  type ResolveTarget,
  statusMeta,
} from "@/components/manager/stock/manager-supply-requests.support";
import { formatTransferRequester } from "@/components/manager/stock/manager-transfers-page-actions";
import { TransferDetailPanel } from "@/components/stock/transfer-detail-panel";
import {
  adminTransferLanes,
  countAgeingTransfers,
  filterTransfers,
  getLaneCounts,
} from "@/components/stock/transfer-workspace.support";
import { TransferWorkspaceShell } from "@/components/stock/transfer-workspace-shell";
import { AppBanner } from "@/components/system/app-banner";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { useActiveLocationScopeOptional } from "@/lib/authorization/use-active-location-scope";
import {
  fetchManagerIncomingSupplyRequests,
  fetchManagerSupplyRequests,
  managerIncomingSupplyRequestsQueryKey,
  managerSupplyRequestsQueryKey,
} from "@/lib/react-query/stock-supply";

const DEFAULT_ADMIN_TRANSFER_LANE =
  adminTransferLanes[0]?.key ?? "needs_review";

export function AdminTransfersPageClient() {
  const [resolveTarget, setResolveTarget] = useState<ResolveTarget | null>(
    null,
  );
  const [overrideTarget, setOverrideTarget] = useState<{
    action: AdminTransferOverrideAction;
    item: StockSupplyRequestResponse;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [selectedLane, setSelectedLane] = useState(DEFAULT_ADMIN_TRANSFER_LANE);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(
    null,
  );
  const queryClient = useQueryClient();
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = useActiveLocationScopeOptional("stock.supply.manage");

  const selectedLocationQuery = useMemo(
    () =>
      selectedLocationScope
        ? {
            locationId: selectedLocationScope.locationId,
            page: 1,
            pageSize: 50,
          }
        : null,
    [selectedLocationScope],
  );
  const networkQuery = useMemo(() => ({ page: 1, pageSize: 50 }), []);

  const transfersQuery = useQuery({
    enabled: !isLoading,
    queryFn: () =>
      selectedLocationQuery
        ? fetchManagerSupplyRequests(selectedLocationQuery)
        : fetchManagerIncomingSupplyRequests(networkQuery),
    queryKey: selectedLocationQuery
      ? managerSupplyRequestsQueryKey(selectedLocationQuery)
      : managerIncomingSupplyRequestsQueryKey(networkQuery),
    staleTime: 30_000,
  });

  const allItems = transfersQuery.data?.items ?? [];
  const manageableLocationIds = useMemo(
    () => accessibleLocationScopes.map((scope) => scope.locationId),
    [accessibleLocationScopes],
  );
  const counts = useMemo(
    () => getLaneCounts(allItems, adminTransferLanes),
    [allItems],
  );
  const ageingCount = useMemo(() => countAgeingTransfers(allItems), [allItems]);
  const filteredItems = useMemo(
    () => filterTransfers(allItems, adminTransferLanes, selectedLane, search),
    [allItems, search, selectedLane],
  );
  const selectedItem =
    filteredItems.find((item) => item.supplyRequestId === selectedTransferId) ??
    filteredItems[0] ??
    null;

  function handleRetry() {
    void queryClient.refetchQueries({
      queryKey: selectedLocationQuery
        ? managerSupplyRequestsQueryKey(selectedLocationQuery)
        : managerIncomingSupplyRequestsQueryKey(networkQuery),
    });
  }

  function handleSuccess() {
    handleRetry();
    setResolveTarget(null);
    setOverrideTarget(null);
  }

  return (
    <PageShell>
      <PageHeader
        description="Monitor review pressure, source bottlenecks, ageing transfers, and exception states from one cross-location control tower."
        title="Transfers"
      />

      <LocationScopePanel
        allOptionLabel="All locations"
        description="All locations keeps the network control tower view. Selecting one location narrows the queue to that location's full transfer picture before you intervene."
        emptyDescription="No active locations are available for transfer monitoring."
        isLoading={isLoading}
        label="Control tower scope"
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Transfer scope"
      />
      {ageingCount > 0 || (counts.exceptions ?? 0) > 0 ? (
        <AppBanner
          description={`Ageing transfers: ${ageingCount}. Exceptions: ${counts.exceptions ?? 0}. Use the matching lanes below to inspect and intervene.`}
          title="Control-tower attention needed"
          tone="warning"
        />
      ) : null}

      <TransferWorkspaceShell
        detail={
          selectedItem ? (
            <TransferDetailPanel
              actions={
                <AdminTransferActions
                  canManage={manageableLocationIds.includes(
                    selectedItem.sourceLocationId,
                  )}
                  item={selectedItem}
                  onAction={(action) =>
                    setResolveTarget({ action, item: selectedItem })
                  }
                  onOverride={(action) =>
                    setOverrideTarget({ action, item: selectedItem })
                  }
                />
              }
              item={selectedItem}
              requesterLabel="Requester"
              requesterValue={formatTransferRequester(selectedItem)}
              status={statusMeta(selectedItem.status)}
            />
          ) : undefined
        }
        emptyDescription="No transfers match this control-tower lane right now."
        emptyTitle="No transfers in this lane"
        isLoading={isLoading || transfersQuery.isPending}
        items={filteredItems}
        laneCounts={counts}
        laneDescription="Lane counts update with the active network scope. Focus on bottlenecks, exceptions, and ageing work before intervening."
        lanes={adminTransferLanes}
        laneTitle="Control-tower lanes"
        onLaneChange={setSelectedLane}
        onRetry={handleRetry}
        onSearchChange={setSearch}
        onSelect={setSelectedTransferId}
        queryError={transfersQuery.error ?? null}
        queryState={
          transfersQuery.isError
            ? "error"
            : transfersQuery.isPending
              ? "pending"
              : "success"
        }
        queueDescription="Transfers in the currently selected control-tower lane"
        queueTitle="Transfer queue"
        search={search}
        selectedItem={selectedItem}
        selectedLane={selectedLane}
        selectedTransferId={selectedItem?.supplyRequestId ?? null}
      />

      <ActionDialog
        onOpenChange={(open) => {
          if (!open) {
            setResolveTarget(null);
          }
        }}
        onSuccess={handleSuccess}
        open={!!resolveTarget}
        target={resolveTarget}
      />
      <AdminTransferOverrideDialog
        onOpenChange={(open) => {
          if (!open) {
            setOverrideTarget(null);
          }
        }}
        onSuccess={handleSuccess}
        open={!!overrideTarget}
        target={overrideTarget}
      />
    </PageShell>
  );
}
