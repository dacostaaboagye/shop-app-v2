"use client";
import { useQuery } from "@tanstack/react-query";
import { StockWorkspaceListSkeleton } from "@/components/stock/stock-workspace-feedback";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import {
  fetchOfficialDocumentProfile,
  officialDocumentProfileQueryKey,
} from "@/lib/react-query/official-documents";
import {
  fetchWorkerAssignments,
  workerAssignmentsQueryKey,
} from "@/lib/react-query/worker-assignments";
import { StockList } from "./worker-stock-page-sections";

export function WorkerStockPageClient() {
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("stock.assignments.own.view");

  const stockQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () => {
      if (!selectedLocationScope) {
        throw new Error("A stock location is required.");
      }
      return fetchWorkerAssignments(selectedLocationScope.locationId);
    },
    queryKey: workerAssignmentsQueryKey(
      selectedLocationScope?.locationId ?? "",
    ),
    staleTime: 30_000,
  });

  const items = stockQuery.data?.items ?? [];
  const profileQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () =>
      fetchOfficialDocumentProfile(selectedLocationScope?.locationId),
    queryKey: officialDocumentProfileQueryKey(
      selectedLocationScope?.locationId,
    ),
    staleTime: 5 * 60_000,
  });
  const moneyProfile = profileQuery.data ?? DEFAULT_OFFICIAL_DOCUMENT_PROFILE;

  return (
    <PageShell>
      <PageHeader
        description="Product variants currently assigned to you at your location."
        title="My stock"
      />
      <LocationScopePanel
        description="Stock loads from the location scope already attached to your worker access."
        emptyDescription="No assigned location is available for your stock view."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={(slug) => {
          setSelectedLocationSlug(slug);
        }}
        selectedLocationSlug={selectedLocationSlug}
        title="Stock location"
      />

      {stockQuery.isPending && selectedLocationScope ? (
        <StockWorkspaceListSkeleton
          cardClassName="h-20 w-full rounded-xl"
          keys={[1, 2, 3, 4, 5, 6, 7, 8]}
        />
      ) : stockQuery.isError ? (
        <AppErrorBanner
          detail="Could not load your assigned stock."
          error={stockQuery.error}
          onRetry={() => void stockQuery.refetch()}
          title="Unable to load stock"
        />
      ) : selectedLocationScope ? (
        <StockList
          items={items}
          locationName={
            stockQuery.data?.locationName || selectedLocationScope.locationName
          }
          moneyProfile={moneyProfile}
        />
      ) : null}
    </PageShell>
  );
}
