"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { SalesLedgerWorkspace } from "@/components/sales/sales-ledger-workspace";
import { replaceSalesQuery } from "@/components/sales/sales-page-query.support";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { useActiveLocationScopeOptional } from "@/lib/authorization/use-active-location-scope";
import { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import {
  fetchOfficialDocumentProfile,
  officialDocumentProfileQueryKey,
} from "@/lib/react-query/official-documents";
import {
  adminInvoicesQueryKey,
  fetchAdminInvoices,
} from "@/lib/react-query/pos-sales";
import { getPageCount, readStringParam } from "@/lib/url-state";
import { AdminInvoiceExportButton } from "./admin-invoice-export-button";
import { AdminSalesLoadingState } from "./admin-sales-loading-state";
import {
  ADMIN_SALES_DEFAULT_DATE_RANGE,
  readAdminSalesQueryState,
} from "./admin-sales-page-client.support";
import { AdminSalesScopePanel } from "./admin-sales-scope-panel";

export function AdminSalesPageClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftSearch, setDraftSearch] = useState(
    readStringParam(searchParams, "q"),
  );
  const {
    channel,
    classification,
    currentPayableOnly,
    dateFrom,
    dateTo,
    documentType,
    page,
    pageSize,
    querySearch,
    status,
  } = readAdminSalesQueryState(searchParams);
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
  useEffect(() => {
    setDraftSearch(querySearch);
  }, [querySearch]);
  useEffect(() => {
    if (draftSearch === querySearch) return;

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
        channel,
        classification,
        currentPayableOnly,
        dateFrom,
        dateTo,
        documentType,
        ...(selectedLocationScope
          ? { locationId: selectedLocationScope.locationId }
          : {}),
        page,
        pageSize,
        ...(querySearch ? { q: querySearch } : {}),
        status,
      }) as const,
    [
      channel,
      classification,
      currentPayableOnly,
      dateFrom,
      dateTo,
      documentType,
      page,
      pageSize,
      querySearch,
      selectedLocationScope,
      status,
    ],
  );
  const salesQuery = useQuery({
    enabled: !isLoading && accessibleLocationScopes.length > 0,
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchAdminInvoices(query),
    queryKey: [...adminInvoicesQueryKey(query), "ledger"],
    staleTime: 30_000,
  });
  const profileLocationId =
    selectedLocationScope?.locationId ??
    accessibleLocationScopes[0]?.locationId;
  const profileQuery = useQuery({
    enabled: !!profileLocationId,
    queryFn: () => fetchOfficialDocumentProfile(profileLocationId),
    queryKey: officialDocumentProfileQueryKey(profileLocationId),
    staleTime: 5 * 60_000,
  });
  const records = useMemo(
    () => salesQuery.data?.items ?? [],
    [salesQuery.data],
  );
  const totalPages = getPageCount(salesQuery.data?.total ?? 0, pageSize);
  const safePage = Math.min(page, totalPages);
  useEffect(() => {
    if (!salesQuery.data || safePage === page) return;

    replaceSalesQuery(router, pathname, searchParams, {
      page: safePage === 1 ? null : safePage,
    });
  }, [page, pathname, router, safePage, salesQuery.data, searchParams]);

  return (
    <PageShell>
      <PageHeader
        description="Cross-location invoice ledger with backend-calculated reporting totals and export-ready document semantics."
        title="Sales ledger"
      />

      <AdminSalesScopePanel
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
      />

      {salesQuery.isPending && accessibleLocationScopes.length > 0 ? (
        <AdminSalesLoadingState />
      ) : salesQuery.isError ? (
        <AppErrorBanner
          detail="Could not load the admin invoice ledger."
          error={salesQuery.error}
          onRetry={() => void salesQuery.refetch()}
          title="Unable to load invoices"
        />
      ) : salesQuery.data ? (
        <SalesLedgerWorkspace
          channel={channel}
          classification={classification}
          currentPayableOnly={currentPayableOnly}
          dateFrom={dateFrom}
          dateTo={dateTo}
          documentType={documentType}
          moneyProfile={profileQuery.data ?? DEFAULT_OFFICIAL_DOCUMENT_PROFILE}
          page={safePage}
          pageSize={pageSize}
          records={records}
          reportingTotals={salesQuery.data.totals}
          search={draftSearch}
          status={status}
          toolbarAction={
            <AdminInvoiceExportButton
              disabled={salesQuery.isFetching || salesQuery.data.total === 0}
              query={query}
            />
          }
          totalCount={salesQuery.data.total}
          onChannelChange={(value) =>
            replaceSalesQuery(router, pathname, searchParams, {
              channel: value === "all" ? null : value,
              page: null,
            })
          }
          onDateFromChange={(value) =>
            replaceSalesQuery(router, pathname, searchParams, {
              dateFrom:
                value === ADMIN_SALES_DEFAULT_DATE_RANGE.dateFrom
                  ? null
                  : value || null,
              page: null,
            })
          }
          onDateToChange={(value) =>
            replaceSalesQuery(router, pathname, searchParams, {
              dateTo:
                value === ADMIN_SALES_DEFAULT_DATE_RANGE.dateTo
                  ? null
                  : value || null,
              page: null,
            })
          }
          onClassificationChange={(value) =>
            replaceSalesQuery(router, pathname, searchParams, {
              classification: value === "all" ? null : value,
              page: null,
            })
          }
          onCurrentPayableOnlyChange={(value) =>
            replaceSalesQuery(router, pathname, searchParams, {
              currentPayableOnly: value ? "true" : null,
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
          onStatusChange={(value) =>
            replaceSalesQuery(router, pathname, searchParams, {
              page: null,
              status: value === "all" ? null : value,
            })
          }
        />
      ) : null}
    </PageShell>
  );
}
