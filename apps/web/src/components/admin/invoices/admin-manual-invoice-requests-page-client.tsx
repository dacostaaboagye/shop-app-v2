"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminSalesScopePanel } from "@/components/admin/admin-sales-scope-panel";
import { AppPagination } from "@/components/data-table/app-pagination";
import { ManualInvoiceRequestFilters } from "@/components/invoices/manual-invoice-request-filters";
import { ManualInvoiceRequestList } from "@/components/invoices/manual-invoice-request-list";
import { MANUAL_INVOICE_STATUS_OPTIONS } from "@/components/invoices/manual-invoice-request-support";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveLocationScopeOptional } from "@/lib/authorization/use-active-location-scope";
import {
  fetchManualInvoiceRequests,
  manualInvoiceRequestsQueryKey,
} from "@/lib/react-query/manual-invoices";
import { toRoute } from "@/lib/routes";
import {
  getPageCount,
  readEnumParam,
  readPositiveIntParam,
  readStringParam,
} from "@/lib/url-state";

export function AdminManualInvoiceRequestsPageClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftSearch, setDraftSearch] = useState(
    readStringParam(searchParams, "q"),
  );
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = useActiveLocationScopeOptional("invoices.manual.view");
  const status = readEnumParam(
    searchParams,
    "status",
    MANUAL_INVOICE_STATUS_OPTIONS,
    "pending",
  );
  const querySearch = readStringParam(searchParams, "q");
  const page = readPositiveIntParam(searchParams, "page", 1);
  const pageSize = readPositiveIntParam(searchParams, "pageSize", 25);

  useEffect(() => setDraftSearch(querySearch), [querySearch]);
  useEffect(() => {
    if (draftSearch === querySearch) return;
    const timeoutId = window.setTimeout(() => {
      replaceQuery(router, pathname, searchParams, {
        page: null,
        q: draftSearch || null,
      });
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [draftSearch, pathname, querySearch, router, searchParams]);

  const query = useMemo(
    () => ({
      ...(selectedLocationScope
        ? { locationId: selectedLocationScope.locationId }
        : {}),
      page,
      pageSize,
      ...(querySearch ? { q: querySearch } : {}),
      status,
    }),
    [page, pageSize, querySearch, selectedLocationScope, status],
  );
  const requestsQuery = useQuery({
    enabled: !isLoading && accessibleLocationScopes.length > 0,
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchManualInvoiceRequests("admin", query),
    queryKey: manualInvoiceRequestsQueryKey("admin", query),
    staleTime: 30_000,
  });
  const totalPages = getPageCount(requestsQuery.data?.total ?? 0, pageSize);
  const safePage = Math.min(page, totalPages);

  return (
    <PageShell>
      <PageHeader
        description="Review pending exceptional invoice requests before any official INV-MAN number is issued."
        title="Manual invoice approvals"
      />

      <AdminSalesScopePanel
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
      />

      <ManualInvoiceRequestFilters
        onSearchChange={setDraftSearch}
        onStatusChange={(value) =>
          replaceQuery(router, pathname, searchParams, {
            page: null,
            status: value === "pending" ? null : value,
          })
        }
        search={draftSearch}
        status={status}
      />

      {requestsQuery.isPending && accessibleLocationScopes.length > 0 ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : requestsQuery.isError ? (
        <AppErrorBanner
          detail="Could not load manual invoice approvals."
          error={requestsQuery.error}
          onRetry={() => void requestsQuery.refetch()}
          title="Unable to load approvals"
        />
      ) : requestsQuery.data ? (
        <>
          <ManualInvoiceRequestList
            emptyDescription="No manual invoice requests match this scope and filter."
            items={requestsQuery.data.items}
            total={requestsQuery.data.total}
            onSelect={(request) =>
              router.push(
                toRoute(
                  `/admin/invoices/manual-requests/${encodeURIComponent(
                    request.reference,
                  )}`,
                ),
              )
            }
          />
          <AppPagination
            onPageChange={(value) =>
              replaceQuery(router, pathname, searchParams, { page: value })
            }
            onPageSizeChange={(value) =>
              replaceQuery(router, pathname, searchParams, {
                page: null,
                pageSize: value,
              })
            }
            page={safePage}
            pageSize={pageSize}
            pageSizeOptions={[10, 25, 50]}
            totalCount={requestsQuery.data.total}
          />
        </>
      ) : null}
    </PageShell>
  );
}

function replaceQuery(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  current: URLSearchParams,
  patch: Record<string, null | number | string>,
) {
  const next = new URLSearchParams(current.toString());
  Object.entries(patch).forEach(([key, value]) => {
    if (value === null || value === "") next.delete(key);
    else next.set(key, String(value));
  });
  const query = next.toString();
  router.replace(toRoute(query ? `${pathname}?${query}` : pathname), {
    scroll: false,
  });
}
