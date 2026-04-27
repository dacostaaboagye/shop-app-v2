"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, Receipt } from "lucide-react";
import { useState } from "react";
import {
  type SalesDocumentTypeFilter,
  SalesListFilters,
} from "@/components/sales/sales-list-filters";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import { formatCount } from "@/lib/display/format";
import { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import { formatMoney, toNumericAmount } from "@/lib/money/format-money";
import {
  fetchOfficialDocumentProfile,
  officialDocumentProfileQueryKey,
} from "@/lib/react-query/official-documents";
import {
  fetchManagerSales,
  managerSalesQueryKey,
} from "@/lib/react-query/pos-sales";
import { ManagerSalesList } from "./manager-sales-list";

const SKELETON_KEYS = [1, 2, 3, 4, 5];

export function ManagerSalesPageClient() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [documentType, setDocumentType] =
    useState<SalesDocumentTypeFilter>("all");
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("pos.sales.manage");

  const query = {
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    documentType,
    locationId: selectedLocationScope?.locationId ?? "",
    page: 1,
    pageSize: 50,
  };
  const salesQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () => fetchManagerSales(query),
    queryKey: managerSalesQueryKey(query),
    staleTime: 30_000,
  });
  const profileQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () =>
      fetchOfficialDocumentProfile(selectedLocationScope?.locationId),
    queryKey: officialDocumentProfileQueryKey(
      selectedLocationScope?.locationId,
    ),
    staleTime: 5 * 60_000,
  });

  const items = salesQuery.data?.items ?? [];
  const posItems = items.filter((item) => item.type === "pos");
  const totalRevenue = posItems.reduce(
    (sum, item) => sum + (toNumericAmount(item.totalAmount) ?? 0),
    0,
  );
  const moneyProfile = profileQuery.data ?? DEFAULT_OFFICIAL_DOCUMENT_PROFILE;

  return (
    <PageShell>
      <PageHeader
        description="All POS sales and credit notes for this location."
        title="Sales overview"
      />

      <LocationScopePanel
        description="Sales visibility follows the location scopes already granted to your manager access."
        emptyDescription="No managed location is available for sales oversight."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Sales location"
      />

      <SalesListFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        documentType={documentType}
        onClear={() => {
          setDateFrom("");
          setDateTo("");
          setDocumentType("all");
        }}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onDocumentTypeChange={setDocumentType}
      />

      {salesQuery.isPending && selectedLocationScope ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {SKELETON_KEYS.map((key) => (
              <Skeleton key={key} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ) : salesQuery.isError ? (
        <AppErrorBanner
          detail="Could not load sales data."
          error={salesQuery.error}
          onRetry={() => void salesQuery.refetch()}
          title="Unable to load sales"
        />
      ) : salesQuery.data ? (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              icon={Receipt}
              label="Total transactions"
              value={formatCount(salesQuery.data.total)}
            />
            <StatCard
              icon={BarChart3}
              label="POS sales"
              value={formatCount(posItems.length)}
            />
            <StatCard
              icon={BarChart3}
              label="Total revenue"
              value={formatMoney(totalRevenue, moneyProfile)}
            />
          </div>
          <ManagerSalesList
            moneyProfile={moneyProfile}
            response={salesQuery.data}
          />
        </div>
      ) : null}
    </PageShell>
  );
}
