"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useAuthorization } from "@/components/providers/authorization-provider";
import type { SalesLedgerRecord } from "@/components/sales/sales-ledger-support";
import { createDefaultSalesLedgerDateRange } from "@/components/sales/sales-ledger-support";
import { SalesLedgerWorkspace } from "@/components/sales/sales-ledger-workspace";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveLocationScopeOptional } from "@/lib/authorization/use-active-location-scope";
import { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import {
  fetchOfficialDocumentProfile,
  officialDocumentProfileQueryKey,
} from "@/lib/react-query/official-documents";
import { fetchAllManagerSales } from "@/lib/react-query/pos-sales";

const DEFAULT_DATE_RANGE = createDefaultSalesLedgerDateRange();

export function AdminSalesPageClient() {
  const [dateFrom, setDateFrom] = useState(DEFAULT_DATE_RANGE.dateFrom);
  const [dateTo, setDateTo] = useState(DEFAULT_DATE_RANGE.dateTo);
  const [documentType, setDocumentType] = useState<
    "all" | "credit_note" | "invoice"
  >("all");
  const { can } = useAuthorization();
  const salesScopePermission = can("pos.sales.manage")
    ? "pos.sales.manage"
    : "pos.sales.view";
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = useActiveLocationScopeOptional(salesScopePermission);

  const selectedScopes = useMemo(
    () =>
      selectedLocationScope
        ? [selectedLocationScope]
        : accessibleLocationScopes,
    [accessibleLocationScopes, selectedLocationScope],
  );
  const salesQuery = useQuery({
    enabled: selectedScopes.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        selectedScopes.map(async (scope) => {
          const items = await fetchAllManagerSales({
            dateFrom,
            dateTo,
            documentType,
            locationId: scope.locationId,
            pageSize: 100,
          });

          return items.map<SalesLedgerRecord>((item) => ({
            ...item,
            locationName: scope.locationName,
            locationSlug: scope.locationSlug,
          }));
        }),
      );

      return results.flat();
    },
    queryKey: [
      "sales",
      "admin-ledger",
      selectedScopes.map((scope) => scope.locationId),
      dateFrom,
      dateTo,
      documentType,
    ],
    staleTime: 30_000,
  });
  const profileQuery = useQuery({
    enabled: selectedScopes.length > 0,
    queryFn: () => fetchOfficialDocumentProfile(selectedScopes[0]?.locationId),
    queryKey: officialDocumentProfileQueryKey(selectedScopes[0]?.locationId),
    staleTime: 5 * 60_000,
  });

  return (
    <PageShell>
      <PageHeader
        description="Daily sales ledger across the visible network, with store-filtered revenue movement over time."
        title="Sales ledger"
      />

      <LocationScopePanel
        allOptionLabel="All visible shops"
        description="Stay at all shops to review network productivity, or isolate one location when a stakeholder wants shop-level detail."
        emptyDescription="No sales locations are available for your current access."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Ledger scope"
      />

      {salesQuery.isPending && selectedScopes.length > 0 ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {[1, 2, 3, 4].map((key) => (
              <Skeleton key={key} className="h-40 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : salesQuery.isError ? (
        <AppErrorBanner
          detail="Could not load the admin sales ledger."
          error={salesQuery.error}
          onRetry={() => void salesQuery.refetch()}
          title="Unable to load sales ledger"
        />
      ) : salesQuery.data ? (
        <SalesLedgerWorkspace
          dateFrom={dateFrom}
          dateTo={dateTo}
          documentType={documentType}
          moneyProfile={profileQuery.data ?? DEFAULT_OFFICIAL_DOCUMENT_PROFILE}
          records={salesQuery.data}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onDocumentTypeChange={setDocumentType}
        />
      ) : null}
    </PageShell>
  );
}
