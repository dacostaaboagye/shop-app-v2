"use client";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { SalesListFilters } from "@/components/sales/sales-list-filters";
import {
  replaceSalesQuery,
  SALES_PAGE_SIZE_OPTIONS,
} from "@/components/sales/sales-page-query.support";
import { StockWorkspaceTableSkeleton } from "@/components/stock/stock-workspace-feedback";
import { AppErrorBanner } from "@/components/system/app-error";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import {
  fetchOfficialDocumentProfile,
  officialDocumentProfileQueryKey,
} from "@/lib/react-query/official-documents";
import {
  fetchWorkerSales,
  workerSalesQueryKey,
} from "@/lib/react-query/pos-sales";
import { toRoute } from "@/lib/routes";
import {
  getPageCount,
  readEnumParam,
  readPositiveIntParam,
  readStringParam,
} from "@/lib/url-state";
import {
  getWorkerSalesTableState,
  WORKER_SALES_DOCUMENT_TYPES,
  WORKER_SALES_TABLE_SKELETON_KEYS,
} from "./sales-history-page-client.support";
import { buildSalesHistoryTableColumns } from "./sales-history-table-columns";

export function SalesHistoryPageClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftSearch, setDraftSearch] = useState(
    readStringParam(searchParams, "q"),
  );
  const classification = readEnumParam(
    searchParams,
    "classification",
    ["all", "internal", "outgoing"] as const,
    "all",
  );
  const dateFrom = readStringParam(searchParams, "dateFrom");
  const dateTo = readStringParam(searchParams, "dateTo");
  const documentType = readEnumParam(
    searchParams,
    "documentType",
    WORKER_SALES_DOCUMENT_TYPES,
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
  } = usePermissionLocationScope("pos.sales.view");
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
    () => ({
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      classification,
      ...(querySearch ? { q: querySearch } : {}),
      documentType,
      locationId: selectedLocationScope?.locationId ?? "",
      page,
      pageSize,
    }),
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
    queryFn: () => fetchWorkerSales(query),
    queryKey: workerSalesQueryKey(query),
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
  const totalPages = getPageCount(salesQuery.data?.total ?? 0, pageSize);
  const safePage = Math.min(page, totalPages);
  const hasFilters = Boolean(
    classification !== "all" ||
      dateFrom ||
      dateTo ||
      documentType !== "all" ||
      querySearch,
  );
  const columns = useMemo(
    () =>
      buildSalesHistoryTableColumns(
        profileQuery.data ?? DEFAULT_OFFICIAL_DOCUMENT_PROFILE,
      ),
    [profileQuery.data],
  );
  const tableState = getWorkerSalesTableState(hasFilters);
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
        description="Your recent sales and generated invoices."
        title="Sales history"
      />
      <LocationScopePanel
        description="Sales history loads from the location scope already assigned to your worker access."
        emptyDescription="No assigned location is available for your sales history."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Sales location"
      />
      <SalesListFilters
        classification={classification}
        dateFrom={dateFrom}
        dateTo={dateTo}
        documentType={documentType}
        search={draftSearch}
        onClassificationChange={(value) =>
          replaceSalesQuery(router, pathname, searchParams, {
            classification: value === "all" ? null : value,
            page: null,
          })
        }
        onClear={() =>
          replaceSalesQuery(router, pathname, searchParams, {
            classification: null,
            dateFrom: null,
            dateTo: null,
            documentType: null,
            page: null,
            q: null,
          })
        }
        onDateFromChange={(value) =>
          replaceSalesQuery(router, pathname, searchParams, {
            dateFrom: value || null,
            page: null,
          })
        }
        onDateToChange={(value) =>
          replaceSalesQuery(router, pathname, searchParams, {
            dateTo: value || null,
            page: null,
          })
        }
        onDocumentTypeChange={(value) =>
          replaceSalesQuery(router, pathname, searchParams, {
            documentType: value === "all" ? null : value,
            page: null,
          })
        }
        onSearchChange={setDraftSearch}
      />
      <AppTableWrapper>
        {salesQuery.isPending && !salesQuery.data && selectedLocationScope ? (
          <StockWorkspaceTableSkeleton
            keys={WORKER_SALES_TABLE_SKELETON_KEYS}
          />
        ) : (
          <>
            {salesQuery.isError ? (
              <div className="p-8">
                <AppErrorBanner
                  detail="Could not load sales history."
                  error={salesQuery.error}
                  onRetry={() => void salesQuery.refetch()}
                  title="Unable to load sales"
                />
              </div>
            ) : null}
            <AppDataTable
              columns={columns}
              data={salesQuery.data?.items ?? []}
              density="compact"
              emptyDescription={tableState.emptyDescription}
              emptyTitle={tableState.emptyTitle}
              emptyState={tableState.emptyState}
              getRowId={(row) => row.reference}
              onRowClick={(row: { reference: string }) =>
                router.push(
                  toRoute(
                    `/worker/sales/${encodeURIComponent(row.reference)}` as Route,
                  ),
                )
              }
              pagination={{
                onPageChange: (nextPage) =>
                  replaceSalesQuery(router, pathname, searchParams, {
                    page: nextPage === 1 ? null : nextPage,
                  }),
                onPageSizeChange: (nextPageSize) =>
                  replaceSalesQuery(router, pathname, searchParams, {
                    page: null,
                    pageSize: nextPageSize === 25 ? null : nextPageSize,
                  }),
                page: safePage,
                pageSize,
                pageSizeOptions: SALES_PAGE_SIZE_OPTIONS,
                totalCount: salesQuery.data?.total ?? 0,
              }}
            />
          </>
        )}
      </AppTableWrapper>
    </PageShell>
  );
}
