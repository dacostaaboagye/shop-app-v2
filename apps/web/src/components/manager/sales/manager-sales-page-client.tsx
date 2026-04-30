"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createDefaultSalesLedgerDateRange } from "@/components/sales/sales-ledger-support";
import { SalesLedgerWorkspace } from "@/components/sales/sales-ledger-workspace";
import {
  replaceSalesQuery,
  SALES_PAGE_SIZE_OPTIONS,
} from "@/components/sales/sales-page-query.support";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import {
  fetchOfficialDocumentProfile,
  officialDocumentProfileQueryKey,
} from "@/lib/react-query/official-documents";
import {
  fetchManagerSales,
  managerSalesQueryKey,
} from "@/lib/react-query/pos-sales";
import {
  getPageCount,
  readEnumParam,
  readPositiveIntParam,
  readStringParam,
} from "@/lib/url-state";

const DEFAULT_DATE_RANGE = createDefaultSalesLedgerDateRange();

export function ManagerSalesPageClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftSearch, setDraftSearch] = useState(
    readStringParam(searchParams, "q"),
  );
  const dateFrom =
    readStringParam(searchParams, "dateFrom") || DEFAULT_DATE_RANGE.dateFrom;
  const dateTo =
    readStringParam(searchParams, "dateTo") || DEFAULT_DATE_RANGE.dateTo;
  const classification = readEnumParam(
    searchParams,
    "classification",
    ["all", "internal", "outgoing"] as const,
    "all",
  );
  const documentType = readEnumParam(
    searchParams,
    "documentType",
    ["adjusted", "all", "credit_note", "invoice"] as const,
    "all",
  );
  const querySearch = readStringParam(searchParams, "q");
  const rawPageSize = readPositiveIntParam(searchParams, "pageSize", 25);
  const pageSize = SALES_PAGE_SIZE_OPTIONS.includes(
    rawPageSize as (typeof SALES_PAGE_SIZE_OPTIONS)[number],
  )
    ? rawPageSize
    : 25;
  const page = readPositiveIntParam(searchParams, "page", 1);
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("pos.sales.manage");

  useEffect(() => {
    setDraftSearch(querySearch);
  }, [querySearch]);

  useEffect(() => {
    if (draftSearch === querySearch) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      replaceSalesQuery(router, pathname, searchParams, {
        page: null,
        q: draftSearch || null,
      });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [draftSearch, pathname, querySearch, router, searchParams]);

  const query = useMemo(
    () =>
      ({
        dateFrom,
        dateTo,
        classification,
        documentType,
        ...(querySearch ? { q: querySearch } : {}),
        locationId: selectedLocationScope?.locationId ?? "",
        page,
        pageSize,
      }) as const,
    [
      dateFrom,
      dateTo,
      classification,
      documentType,
      page,
      pageSize,
      querySearch,
      selectedLocationScope,
    ],
  );

  const salesQuery = useQuery({
    enabled: !!selectedLocationScope,
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchManagerSales(query),
    queryKey: [...managerSalesQueryKey(query), "ledger"],
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
  const records = useMemo(
    () => salesQuery.data?.items ?? [],
    [salesQuery.data],
  );
  const totalPages = getPageCount(salesQuery.data?.total ?? 0, pageSize);
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (!salesQuery.data || safePage === page) {
      return;
    }

    replaceSalesQuery(router, pathname, searchParams, {
      page: safePage === 1 ? null : safePage,
    });
  }, [page, pathname, router, safePage, salesQuery.data, searchParams]);

  return (
    <PageShell>
      <PageHeader
        description="Daily sales ledger for the selected location, with revenue movement and return pressure across time."
        title="Sales ledger"
      />

      <LocationScopePanel
        description="Review one managed location at a time so the ledger stays operational and decision-ready."
        emptyDescription="No managed location is available for sales oversight."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Ledger location"
      />

      {salesQuery.isPending && selectedLocationScope ? (
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
          detail="Could not load the sales ledger."
          error={salesQuery.error}
          onRetry={() => void salesQuery.refetch()}
          title="Unable to load sales ledger"
        />
      ) : salesQuery.data ? (
        <SalesLedgerWorkspace
          classification={classification}
          dateFrom={dateFrom}
          dateTo={dateTo}
          documentType={documentType}
          moneyProfile={profileQuery.data ?? DEFAULT_OFFICIAL_DOCUMENT_PROFILE}
          page={safePage}
          pageSize={pageSize}
          records={records}
          search={draftSearch}
          totalCount={salesQuery.data.total}
          onDateFromChange={(value) =>
            replaceSalesQuery(router, pathname, searchParams, {
              dateFrom:
                value === DEFAULT_DATE_RANGE.dateFrom ? null : value || null,
              page: null,
            })
          }
          onDateToChange={(value) =>
            replaceSalesQuery(router, pathname, searchParams, {
              dateTo:
                value === DEFAULT_DATE_RANGE.dateTo ? null : value || null,
              page: null,
            })
          }
          onClassificationChange={(value) =>
            replaceSalesQuery(router, pathname, searchParams, {
              classification: value === "all" ? null : value,
              page: null,
            })
          }
          onDocumentTypeChange={(value) =>
            replaceSalesQuery(router, pathname, searchParams, {
              documentType: value === "all" ? null : value,
              page: null,
            })
          }
          onPageChange={(value) =>
            replaceSalesQuery(router, pathname, searchParams, {
              page: value === 1 ? null : value,
            })
          }
          onPageSizeChange={(value) =>
            replaceSalesQuery(router, pathname, searchParams, {
              page: null,
              pageSize: value === 25 ? null : value,
            })
          }
          onSearchChange={setDraftSearch}
        />
      ) : null}
    </PageShell>
  );
}
