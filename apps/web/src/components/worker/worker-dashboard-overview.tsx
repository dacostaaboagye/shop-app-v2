"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import {
  fetchOfficialDocumentProfile,
  officialDocumentProfileQueryKey,
} from "@/lib/react-query/official-documents";
import {
  fetchWorkerDashboardSummary,
  workerDashboardSummaryQueryKey,
} from "@/lib/react-query/worker-dashboard";
import {
  WorkerActionCenterPanel,
  WorkerStockHealthPanel,
} from "./worker-dashboard-overview.attention-panels";
import {
  RecentSalesPanel,
  WorkerNotificationsPanel,
} from "./worker-dashboard-overview.sections";
import { WorkerSalesInsightsPanel } from "./worker-dashboard-performance-panels";

export function WorkerDashboardOverview() {
  const { can } = useAuthorization();
  const canViewSales = can("pos.sales.view");
  const canProcessSales = can("pos.sales.process");
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("stock.assignments.own.view");

  const dashboardSummaryQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () => {
      if (!selectedLocationScope) {
        throw new Error("Worker dashboard location is required.");
      }
      return fetchWorkerDashboardSummary(selectedLocationScope.locationId);
    },
    queryKey: workerDashboardSummaryQueryKey(
      selectedLocationScope?.locationId ?? "",
    ),
    staleTime: 30_000,
  });
  const moneyProfileQuery = useQuery({
    enabled: !!selectedLocationScope && canViewSales,
    queryFn: () =>
      fetchOfficialDocumentProfile(selectedLocationScope?.locationId),
    queryKey: officialDocumentProfileQueryKey(
      selectedLocationScope?.locationId,
    ),
    staleTime: 5 * 60_000,
  });
  const dashboardSummary = dashboardSummaryQuery.data;
  const stockSummary = dashboardSummary?.stockSummary;
  const latestSalesItems = dashboardSummary?.latestSales ?? [];
  const unreadNotifications = dashboardSummary?.latestNotifications ?? [];
  const dashboardMetrics = dashboardSummary?.metrics ?? null;
  const handleDashboardRetry = () => void dashboardSummaryQuery.refetch();

  return (
    <div className="flex flex-col gap-6">
      <LocationScopePanel
        description="The worker dashboard follows the assigned operating location already attached to your access."
        emptyDescription="No assigned location is available for worker operations."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Active work location"
      />

      {canViewSales ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.8fr)]">
          <WorkerSalesInsightsPanel
            error={dashboardSummaryQuery.error}
            isError={dashboardSummaryQuery.isError}
            isPending={dashboardSummaryQuery.isPending}
            metrics={dashboardMetrics}
            moneyProfile={
              moneyProfileQuery.data ?? DEFAULT_OFFICIAL_DOCUMENT_PROFILE
            }
            onRetry={handleDashboardRetry}
          />
          <WorkerActionCenterPanel
            canProcessSales={canProcessSales}
            lowStockCount={stockSummary?.lowStockCount ?? 0}
            outOfStockCount={stockSummary?.outOfStockCount ?? 0}
            todaySalesCount={dashboardMetrics?.todayReceiptCount ?? 0}
            unreadNotificationCount={
              dashboardMetrics?.unreadNotificationCount ?? 0
            }
          />
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <WorkerStockHealthPanel
          error={dashboardSummaryQuery.error}
          isError={dashboardSummaryQuery.isError}
          isPending={dashboardSummaryQuery.isPending}
          locationName={selectedLocationScope?.locationName}
          onRetry={handleDashboardRetry}
          stockSummary={
            stockSummary ?? {
              assignedVariantCount: 0,
              lowStockCount: 0,
              outOfStockCount: 0,
              topRiskAssignments: [],
              totalAssignedUnits: 0,
              totalAvailableUnits: 0,
            }
          }
        />
        <WorkerNotificationsPanel
          error={dashboardSummaryQuery.error}
          isError={dashboardSummaryQuery.isError}
          isPending={dashboardSummaryQuery.isPending}
          items={unreadNotifications}
          onRetry={handleDashboardRetry}
        />
      </section>

      <section>
        <RecentSalesPanel
          canViewSales={canViewSales}
          error={dashboardSummaryQuery.error}
          isError={dashboardSummaryQuery.isError}
          isPending={dashboardSummaryQuery.isPending}
          items={latestSalesItems}
          moneyProfile={
            moneyProfileQuery.data ?? DEFAULT_OFFICIAL_DOCUMENT_PROFILE
          }
          onRetry={handleDashboardRetry}
        />
      </section>
    </div>
  );
}
