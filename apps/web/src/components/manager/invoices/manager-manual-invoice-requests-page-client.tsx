"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppPagination } from "@/components/data-table/app-pagination";
import { ManualInvoiceRequestFilters } from "@/components/invoices/manual-invoice-request-filters";
import { ManualInvoiceRequestList } from "@/components/invoices/manual-invoice-request-list";
import { MANUAL_INVOICE_STATUS_OPTIONS } from "@/components/invoices/manual-invoice-request-support";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveLocationScope } from "@/lib/authorization/use-active-location-scope";
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

export function ManagerManualInvoiceRequestsPageClient() {
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
  } = useActiveLocationScope("invoices.manual.view");
  const status = readEnumParam(
    searchParams,
    "status",
    MANUAL_INVOICE_STATUS_OPTIONS,
    "all",
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
    enabled: !!selectedLocationScope,
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchManualInvoiceRequests("manager", query),
    queryKey: manualInvoiceRequestsQueryKey("manager", query),
    staleTime: 30_000,
  });
  const totalPages = getPageCount(requestsQuery.data?.total ?? 0, pageSize);
  const safePage = Math.min(page, totalPages);

  return (
    <PageShell>
      <PageHeader
        description="Track exceptional invoice requests before they become official manual invoices."
        title="Manual invoice requests"
        actions={
          <Button
            render={
              <Link href={toRoute("/manager/invoices/manual-requests/new")} />
            }
          >
            New request
          </Button>
        }
      />

      <LocationScopePanel
        description="Create and review requests for one managed location at a time."
        emptyDescription="No managed location is available for manual invoice requests."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Request location"
      />

      <ManualInvoiceRequestFilters
        onSearchChange={setDraftSearch}
        onStatusChange={(value) =>
          replaceQuery(router, pathname, searchParams, {
            page: null,
            status: value === "all" ? null : value,
          })
        }
        search={draftSearch}
        status={status}
      />

      {requestsQuery.isPending && selectedLocationScope ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : requestsQuery.isError ? (
        <AppErrorBanner
          detail="Could not load manual invoice requests."
          error={requestsQuery.error}
          onRetry={() => void requestsQuery.refetch()}
          title="Unable to load requests"
        />
      ) : requestsQuery.data ? (
        <>
          <ManualInvoiceRequestList
            actionLabel="Open"
            emptyDescription="No manual invoice requests match this location and filter."
            items={requestsQuery.data.items}
            total={requestsQuery.data.total}
            onSelect={(request) =>
              router.push(
                toRoute(
                  `/manager/invoices/manual-requests/${encodeURIComponent(
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
