"use client";

import type { StockSupplyRequestResponse } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ClipboardList, PackageCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TransferDetailPanel } from "@/components/stock/transfer-detail-panel";
import {
  filterTransfers,
  getLaneCounts,
  workerTransferLanes,
} from "@/components/stock/transfer-workspace.support";
import { TransferWorkspaceShell } from "@/components/stock/transfer-workspace-shell";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { StatCard } from "@/components/system/page-shell-cards";
import { Button } from "@/components/ui/button";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import {
  fetchWorkerSupplyRequests,
  patchWorkerCancelSupplyRequest,
  workerSupplyRequestsQueryKey,
} from "@/lib/react-query/stock-supply";
import { ConfirmReceiptDialog } from "./worker-supply-request-confirm-dialog";
import { workerStatusMeta } from "./worker-supply-requests.support";

const QUERY = { page: 1, pageSize: 50 };
const DEFAULT_WORKER_TRANSFER_LANE = workerTransferLanes[0]?.key ?? "open";

export function WorkerTransfersPageClient() {
  const [confirmTarget, setConfirmTarget] =
    useState<StockSupplyRequestResponse | null>(null);
  const [search, setSearch] = useState("");
  const [selectedLane, setSelectedLane] = useState(
    DEFAULT_WORKER_TRANSFER_LANE,
  );
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(
    null,
  );
  const queryClient = useQueryClient();
  const transfersQuery = useQuery({
    queryFn: () => fetchWorkerSupplyRequests(QUERY),
    queryKey: workerSupplyRequestsQueryKey(QUERY),
    staleTime: 30_000,
  });
  const allItems = transfersQuery.data?.items ?? [];
  const counts = useMemo(
    () => getLaneCounts(allItems, workerTransferLanes),
    [allItems],
  );
  const filteredItems = useMemo(
    () => filterTransfers(allItems, workerTransferLanes, selectedLane, search),
    [allItems, search, selectedLane],
  );
  const selectedItem =
    filteredItems.find((item) => item.supplyRequestId === selectedTransferId) ??
    filteredItems[0] ??
    null;

  function handleRetry() {
    void queryClient.refetchQueries({
      queryKey: workerSupplyRequestsQueryKey(QUERY),
    });
  }

  return (
    <PageShell>
      <PageHeader
        description="Track each stock transfer from request, through source reservation, to receipt at your location."
        title="My transfers"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          description="Requests still under review or already reserved."
          icon={ClipboardList}
          label="Open"
          value={counts.open ?? 0}
        />
        <StatCard
          description="Transfers currently moving to your location."
          icon={ArrowRight}
          label="In transit"
          value={counts.in_transit ?? 0}
        />
        <StatCard
          description="Received, rejected, or cancelled transfers."
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
                <WorkerTransferActions
                  item={selectedItem}
                  onConfirmReceipt={setConfirmTarget}
                />
              }
              item={selectedItem}
              requesterLabel="Requester"
              requesterValue="You"
              status={workerStatusMeta(selectedItem.status)}
            />
          ) : undefined
        }
        emptyDescription="No transfers match this lane right now."
        isLoading={transfersQuery.isPending}
        items={filteredItems}
        lanes={workerTransferLanes}
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

      <ConfirmReceiptDialog
        onOpenChange={(open) => {
          if (!open) {
            setConfirmTarget(null);
          }
        }}
        onSuccess={() => {
          void transfersQuery.refetch();
          setConfirmTarget(null);
        }}
        open={!!confirmTarget}
        target={confirmTarget}
      />
    </PageShell>
  );
}

function WorkerTransferActions({
  item,
  onConfirmReceipt,
}: {
  item: StockSupplyRequestResponse;
  onConfirmReceipt: (item: StockSupplyRequestResponse) => void;
}) {
  const queryClient = useQueryClient();
  const canCancel = item.status === "pending" || item.status === "approved";
  const canConfirm = item.status === "dispatched";
  const cancelMutation = useMutation({
    mutationFn: () => patchWorkerCancelSupplyRequest(item.supplyRequestId),
    onError(error) {
      toast.error(
        getAppErrorMessage(error, { fallbackDetail: "Failed to cancel." }),
      );
    },
    onSuccess() {
      toast.success("Transfer request cancelled.");
      void queryClient.invalidateQueries({
        queryKey: workerSupplyRequestsQueryKey({}),
      });
    },
  });

  if (!canCancel && !canConfirm) {
    return undefined;
  }

  return (
    <div className="flex flex-col gap-2">
      {canConfirm ? (
        <Button onClick={() => onConfirmReceipt(item)} size="lg">
          Confirm receipt
        </Button>
      ) : null}
      {canCancel ? (
        <Button
          disabled={cancelMutation.isPending}
          onClick={() => cancelMutation.mutate()}
          size="lg"
          variant="outline"
        >
          {cancelMutation.isPending ? "Cancelling..." : "Cancel transfer"}
        </Button>
      ) : null}
    </div>
  );
}
