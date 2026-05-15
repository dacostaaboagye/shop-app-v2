"use client";

import { useQuery } from "@tanstack/react-query";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminLocationsQueryKey,
  fetchAdminLocations,
} from "@/lib/react-query/admin-directory";
import { StockTakeSessionHistory } from "./stock-take-session-history";
import { StockTakeSheetCard } from "./stock-take-sheet-card";

const STOCK_TAKE_LOCATION_QUERY = {
  dir: "asc" as const,
  page: 1,
  pageSize: 100,
  q: "",
  sort: "name" as const,
  status: "active" as const,
  type: "all" as const,
};

export function AdminStockTakeGenerationPageClient() {
  const locationsQuery = useQuery({
    queryFn: () => fetchAdminLocations(STOCK_TAKE_LOCATION_QUERY),
    queryKey: adminLocationsQueryKey(STOCK_TAKE_LOCATION_QUERY),
    staleTime: 60_000,
  });
  const locationOptions =
    locationsQuery.data?.items.map((location) => ({
      name: location.name,
      slug: location.slug,
    })) ?? [];

  return (
    <PageShell>
      <PageHeader
        description="Generate blind or assisted XLSX workbooks for controlled physical counts."
        title="Stock-take workbooks"
      />

      {locationsQuery.isPending ? (
        <Skeleton className="h-80 rounded-xl" />
      ) : locationsQuery.isError ? (
        <AppErrorBanner
          detail="Locations are required before a stock-take workbook can be generated."
          error={locationsQuery.error}
          onRetry={() => void locationsQuery.refetch()}
          title="Unable to load locations"
        />
      ) : locationOptions.length === 0 ? (
        <AppEmptyState
          description="Add an active location before preparing a stock-take workbook."
          title="No active locations"
        />
      ) : (
        <div className="flex flex-col gap-6">
          <StockTakeSheetCard locations={locationOptions} portal="admin" />
          <StockTakeSessionHistory portal="admin" />
        </div>
      )}
    </PageShell>
  );
}
