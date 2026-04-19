"use client";

import type { AdminLocationListQuery } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AppDataTable,
  type AppDataTableSort,
} from "@/components/data-table/app-data-table";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { PermissionGate } from "@/components/system/permission-gate";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminLocationsQueryKey,
  fetchAdminLocations,
} from "@/lib/react-query/admin-directory";
import { toRoute } from "@/lib/routes";
import {
  getPageCount,
  readEnumParam,
  readPositiveIntParam,
  readStringParam,
} from "@/lib/url-state";
import { locationTableColumns } from "./location-table-columns";
import {
  getLocationsErrorMessage,
  LOCATION_PAGE_SIZE_OPTIONS,
  LOCATION_SKELETON_KEYS,
  LOCATION_SORT_OPTIONS,
  LOCATION_STATUS_OPTIONS,
  LOCATION_TYPE_OPTIONS,
  replaceLocationQuery,
} from "./locations-page-client.support";
import { LocationsPageToolbar } from "./locations-page-toolbar";

export function LocationsPageClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftSearch, setDraftSearch] = useState(
    readStringParam(searchParams, "q"),
  );
  const query = readStringParam(searchParams, "q");
  const sort = readEnumParam(
    searchParams,
    "sort",
    LOCATION_SORT_OPTIONS,
    "name",
  );
  const dir = readEnumParam(searchParams, "dir", ["asc", "desc"], "asc");
  const status = readEnumParam(
    searchParams,
    "status",
    LOCATION_STATUS_OPTIONS,
    "all",
  );
  const type = readEnumParam(
    searchParams,
    "type",
    LOCATION_TYPE_OPTIONS,
    "all",
  );
  const rawPageSize = readPositiveIntParam(searchParams, "pageSize", 10);
  const pageSize = LOCATION_PAGE_SIZE_OPTIONS.includes(
    rawPageSize as (typeof LOCATION_PAGE_SIZE_OPTIONS)[number],
  )
    ? rawPageSize
    : 10;
  const page = readPositiveIntParam(searchParams, "page", 1);

  useEffect(() => {
    setDraftSearch(query);
  }, [query]);

  useEffect(() => {
    if (draftSearch === query) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      replaceLocationQuery(router, pathname, searchParams, {
        page: null,
        q: draftSearch || null,
      });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [draftSearch, pathname, query, router, searchParams]);

  const backendQuery = useMemo<AdminLocationListQuery>(
    () => ({ dir, page, pageSize, q: query, sort, status, type }),
    [dir, page, pageSize, query, sort, status, type],
  );
  const locationsQuery = useQuery({
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchAdminLocations(backendQuery),
    queryKey: adminLocationsQueryKey(backendQuery),
  });
  const totalPages = getPageCount(
    locationsQuery.data?.totalCount ?? 0,
    pageSize,
  );
  const safePage = Math.min(page, totalPages);
  const hasFilters = query !== "" || status !== "all" || type !== "all";
  const sorting: AppDataTableSort = { columnId: sort, direction: dir };

  useEffect(() => {
    if (!locationsQuery.data || safePage === page) {
      return;
    }
    replaceLocationQuery(router, pathname, searchParams, {
      page: safePage === 1 ? null : safePage,
    });
  }, [locationsQuery.data, page, pathname, router, safePage, searchParams]);

  return (
    <PageShell>
      <PageHeader
        actions={
          <PermissionGate permission="locations.create">
            <Link
              className={buttonVariants({ size: "sm" })}
              href={toRoute("/admin/locations/new")}
            >
              New location
            </Link>
          </PermissionGate>
        }
        description="Backend-backed location directory with URL-synced filters and server pagination."
        title="Locations"
      />
      <LocationsPageToolbar
        draftSearch={draftSearch}
        hasFilters={hasFilters}
        onClear={() =>
          replaceLocationQuery(router, pathname, searchParams, {
            page: null,
            q: null,
            status: null,
            type: null,
          })
        }
        onSearchChange={setDraftSearch}
        onStatusChange={(value) =>
          replaceLocationQuery(router, pathname, searchParams, {
            page: null,
            status: value === "all" ? null : value,
          })
        }
        onTypeChange={(value) =>
          replaceLocationQuery(router, pathname, searchParams, {
            page: null,
            type: value === "all" ? null : value,
          })
        }
        status={status}
        totalCount={locationsQuery.data?.totalCount ?? 0}
        type={type}
      />

      {locationsQuery.isPending && !locationsQuery.data ? (
        <div className="flex flex-col gap-2">
          {LOCATION_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-11 w-full" />
          ))}
        </div>
      ) : (
        <>
          {locationsQuery.isError ? (
            <AppErrorBanner
              detail={getLocationsErrorMessage(locationsQuery.error)}
              error={locationsQuery.error}
              onRetry={() => {
                void locationsQuery.refetch();
              }}
              title="Unable to load locations"
            />
          ) : null}
          <AppDataTable
            columns={locationTableColumns}
            data={locationsQuery.data?.items ?? []}
            density="compact"
            emptyDescription={
              hasFilters
                ? "Try adjusting the current filters or search term."
                : "No locations were returned from the current backend dataset."
            }
            emptyTitle={
              hasFilters ? "No locations match" : "No locations available"
            }
            emptyState={{
              kind: hasFilters ? "no-results" : "no-data",
            }}
            getRowId={(row) => row.slug}
            onRowClick={(row: { slug: string }) =>
              router.push(
                toRoute(`/admin/locations/${encodeURIComponent(row.slug)}`),
              )
            }
            onSortingChange={(nextSorting) =>
              replaceLocationQuery(router, pathname, searchParams, {
                dir: nextSorting?.direction ?? null,
                page: null,
                sort: nextSorting?.columnId ?? null,
              })
            }
            pagination={{
              onPageChange: (nextPage) =>
                replaceLocationQuery(router, pathname, searchParams, {
                  page: nextPage === 1 ? null : nextPage,
                }),
              onPageSizeChange: (nextPageSize) =>
                replaceLocationQuery(router, pathname, searchParams, {
                  page: null,
                  pageSize: nextPageSize === 10 ? null : nextPageSize,
                }),
              page: safePage,
              pageSize,
              pageSizeOptions: LOCATION_PAGE_SIZE_OPTIONS,
              totalCount: locationsQuery.data?.totalCount ?? 0,
            }}
            sorting={sorting}
          />
        </>
      )}
    </PageShell>
  );
}
