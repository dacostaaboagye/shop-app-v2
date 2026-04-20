"use client";

import type { StockSupplyRequestResponse } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchWorkerSupplyRequests,
  workerSupplyRequestsQueryKey,
} from "@/lib/react-query/stock-supply";
import { ConfirmReceiptDialog } from "./worker-supply-request-confirm-dialog";
import { WorkerSupplyRequestList } from "./worker-supply-request-list";
import {
  filterWorkerSupplyRequests,
  getWorkerSupplyRequestCounts,
  type WorkerRequestFilter,
  type WorkerViewMode,
} from "./worker-supply-requests.support";

const QUERY = { page: 1, pageSize: 50 };
const SKELETON_KEYS = [1, 2, 3, 4, 5];

export function WorkerSupplyRequestsPageClient() {
  const [confirmTarget, setConfirmTarget] =
    useState<StockSupplyRequestResponse | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<WorkerRequestFilter>("all");
  const [viewMode, setViewMode] = useState<WorkerViewMode>("card");
  const requestsQuery = useQuery({
    queryFn: () => fetchWorkerSupplyRequests(QUERY),
    queryKey: workerSupplyRequestsQueryKey(QUERY),
    staleTime: 30_000,
  });
  const allItems = requestsQuery.data?.items ?? [];
  const filteredItems = useMemo(
    () => filterWorkerSupplyRequests(allItems, statusFilter, search),
    [allItems, search, statusFilter],
  );
  const counts = useMemo(
    () => getWorkerSupplyRequestCounts(allItems),
    [allItems],
  );

  return (
    <PageShell>
      <PageHeader
        description="Track the status of your restocking requests."
        title="My supply requests"
      />
      <WorkerRequestContent
        allItems={allItems}
        counts={counts}
        filteredItems={filteredItems}
        onConfirmReceipt={setConfirmTarget}
        onRetry={() => void requestsQuery.refetch()}
        onSearchChange={setSearch}
        onStatusFilterChange={setStatusFilter}
        onViewModeChange={setViewMode}
        queryError={requestsQuery.error}
        queryState={requestsQuery.status}
        search={search}
        statusFilter={statusFilter}
        viewMode={viewMode}
      />
      <ConfirmReceiptDialog
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null);
        }}
        onSuccess={() => {
          void requestsQuery.refetch();
          setConfirmTarget(null);
        }}
        open={!!confirmTarget}
        target={confirmTarget}
      />
    </PageShell>
  );
}

function WorkerRequestContent({
  allItems,
  counts,
  filteredItems,
  onConfirmReceipt,
  onRetry,
  onSearchChange,
  onStatusFilterChange,
  onViewModeChange,
  queryError,
  queryState,
  search,
  statusFilter,
  viewMode,
}: {
  allItems: Parameters<typeof WorkerSupplyRequestList>[0]["allItems"];
  counts: Parameters<typeof WorkerSupplyRequestList>[0]["counts"];
  filteredItems: Parameters<typeof WorkerSupplyRequestList>[0]["filteredItems"];
  onConfirmReceipt: Parameters<
    typeof WorkerSupplyRequestList
  >[0]["onConfirmReceipt"];
  onRetry: () => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: WorkerRequestFilter) => void;
  onViewModeChange: (value: WorkerViewMode) => void;
  queryError: Error | null;
  queryState: "error" | "pending" | "success";
  search: string;
  statusFilter: WorkerRequestFilter;
  viewMode: WorkerViewMode;
}) {
  if (queryState === "pending") return <WorkerRequestSkeleton />;
  if (queryState === "error") {
    return (
      <AppErrorBanner
        detail="Could not load your supply requests."
        error={queryError}
        onRetry={onRetry}
        title="Unable to load requests"
      />
    );
  }

  return (
    <WorkerSupplyRequestList
      allItems={allItems}
      counts={counts}
      filteredItems={filteredItems}
      onConfirmReceipt={onConfirmReceipt}
      onSearchChange={onSearchChange}
      onStatusFilterChange={onStatusFilterChange}
      onViewModeChange={onViewModeChange}
      search={search}
      statusFilter={statusFilter}
      viewMode={viewMode}
    />
  );
}

function WorkerRequestSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {SKELETON_KEYS.map((key) => (
        <Skeleton className="h-44 w-full rounded-xl" key={key} />
      ))}
    </div>
  );
}
