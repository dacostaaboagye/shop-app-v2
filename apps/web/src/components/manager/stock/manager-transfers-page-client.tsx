"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  PackageCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ActionDialog } from "@/components/manager/stock/manager-supply-request-action-dialog";
import type { ResolveTarget } from "@/components/manager/stock/manager-supply-requests.support";
import { statusMeta } from "@/components/manager/stock/manager-supply-requests.support";
import { TransferDetailPanel } from "@/components/stock/transfer-detail-panel";
import {
  filterTransfers,
  getLaneCounts,
  managerTransferLanes,
} from "@/components/stock/transfer-workspace.support";
import { TransferWorkspaceShell } from "@/components/stock/transfer-workspace-shell";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { StatCard } from "@/components/system/page-shell-cards";
import { useActiveLocationScopeOptional } from "@/lib/authorization/use-active-location-scope";
import {
  fetchManagerIncomingSupplyRequests,
  fetchManagerSupplyRequests,
  managerIncomingSupplyRequestsQueryKey,
  managerSupplyRequestsQueryKey,
} from "@/lib/react-query/stock-supply";
import {
  formatTransferRequester,
  ManagerTransferActions,
} from "./manager-transfers-page-actions";

const DEFAULT_MANAGER_TRANSFER_LANE =
  managerTransferLanes[0]?.key ?? "needs_review";

export function ManagerTransfersPageClient() {
  const [resolveTarget, setResolveTarget] = useState<ResolveTarget | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [selectedLane, setSelectedLane] = useState(
    DEFAULT_MANAGER_TRANSFER_LANE,
  );
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
  const inboxQuery = useMemo(() => ({ page: 1, pageSize: 50 }), []);

  const transfersQuery = useQuery({
    enabled: !isLoading,
    queryFn: () =>
      selectedLocationQuery
        ? fetchManagerSupplyRequests(selectedLocationQuery)
        : fetchManagerIncomingSupplyRequests(inboxQuery),
    queryKey: selectedLocationQuery
      ? managerSupplyRequestsQueryKey(selectedLocationQuery)
      : managerIncomingSupplyRequestsQueryKey(inboxQuery),
    staleTime: 30_000,
  });

  const allItems = transfersQuery.data?.items ?? [];
  const manageableLocationIds = useMemo(
    () => accessibleLocationScopes.map((scope) => scope.locationId),
    [accessibleLocationScopes],
  );
  const counts = useMemo(
    () => getLaneCounts(allItems, managerTransferLanes),
    [allItems],
  );
  const filteredItems = useMemo(
    () => filterTransfers(allItems, managerTransferLanes, selectedLane, search),
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
        : managerIncomingSupplyRequestsQueryKey(inboxQuery),
    });
  }

  function handleSuccess() {
    handleRetry();
    setResolveTarget(null);
  }

  return (
    <PageShell>
      <PageHeader
        description="Review transfer demand, source reservations, and in-transit stock across your managed locations."
        title="Transfers"
      />

      <LocationScopePanel
        allOptionLabel="All managed locations"
        description="All managed locations shows the review and dispatch queue across your source locations. Selecting one location shows every transfer tied to that location."
        emptyDescription="Assign a managed location before reviewing transfers."
        isLoading={isLoading}
        label="Operating view"
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Transfer workspace"
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          description="Transfers waiting for review."
          icon={ClipboardList}
          label="Needs review"
          value={counts.needs_review ?? 0}
        />
        <StatCard
          description="Approved and reserved at source."
          icon={CheckCircle2}
          label="Reserved"
          value={counts.reserved ?? 0}
        />
        <StatCard
          description="Transfers already on the move."
          icon={ArrowRight}
          label="In transit"
          value={counts.in_transit ?? 0}
        />
        <StatCard
          description="Received, rejected, or cancelled."
          icon={PackageCheck}
          label="Completed"
          value={counts.completed ?? 0}
        />
      </div>

      <TransferWorkspaceShell
        detail={
          selectedItem ? (
            <TransferDetailPanel
              actions={
                <ManagerTransferActions
                  canManage={manageableLocationIds.includes(
                    selectedItem.sourceLocationId,
                  )}
                  item={selectedItem}
                  onAction={(action) =>
                    setResolveTarget({ action, item: selectedItem })
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
        emptyDescription="No transfers match this lane right now."
        isLoading={isLoading || transfersQuery.isPending}
        items={filteredItems}
        lanes={managerTransferLanes}
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
    </PageShell>
  );
}
