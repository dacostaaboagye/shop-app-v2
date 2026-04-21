"use client";

import type { AdminStaffListQuery } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { userTableColumns } from "@/components/admin/users/user-table-columns";
import {
  getUsersErrorMessage,
  replaceUserQuery,
  USER_PAGE_SIZE_OPTIONS,
  USER_SORT_OPTIONS,
  USER_STATUS_FILTER_OPTIONS,
  USER_TABLE_SKELETON_KEYS,
} from "@/components/admin/users/users-page-client.support";
import {
  AppDataTable,
  type AppDataTableSort,
} from "@/components/data-table/app-data-table";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminLocationsQueryKey,
  adminStaffQueryKey,
  fetchAdminLocations,
  fetchAdminStaff,
} from "@/lib/react-query/admin-directory";
import { toRoute } from "@/lib/routes";
import {
  getPageCount,
  readEnumParam,
  readPositiveIntParam,
  readStringParam,
} from "@/lib/url-state";
import {
  AdminStaffFilters,
  LOCATION_FILTER_QUERY,
  STAFF_ROLE_FILTER_OPTIONS,
} from "./admin-staff-filters";

export function AdminStaffPageClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftSearch, setDraftSearch] = useState(
    readStringParam(searchParams, "q"),
  );
  const locationSlug = readStringParam(searchParams, "locationSlug");
  const query = readStringParam(searchParams, "q");
  const role = readEnumParam(
    searchParams,
    "role",
    STAFF_ROLE_FILTER_OPTIONS,
    "all",
  );
  const status = readEnumParam(
    searchParams,
    "status",
    USER_STATUS_FILTER_OPTIONS,
    "all",
  );
  const sort = readEnumParam(searchParams, "sort", USER_SORT_OPTIONS, "name");
  const dir = readEnumParam(searchParams, "dir", ["asc", "desc"], "asc");
  const rawPageSize = readPositiveIntParam(searchParams, "pageSize", 10);
  const pageSize = USER_PAGE_SIZE_OPTIONS.includes(
    rawPageSize as (typeof USER_PAGE_SIZE_OPTIONS)[number],
  )
    ? rawPageSize
    : 10;
  const page = readPositiveIntParam(searchParams, "page", 1);

  useEffect(() => setDraftSearch(query), [query]);

  useEffect(() => {
    if (draftSearch === query) return;
    const timeoutId = window.setTimeout(() => {
      replaceUserQuery(router, pathname, searchParams, {
        page: null,
        q: draftSearch || null,
      });
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [draftSearch, pathname, query, router, searchParams]);

  const backendQuery = useMemo<AdminStaffListQuery>(
    () => ({
      dir,
      locationSlug,
      page,
      pageSize,
      q: query,
      role,
      sort,
      status,
    }),
    [dir, locationSlug, page, pageSize, query, role, sort, status],
  );
  const staffQuery = useQuery({
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchAdminStaff(backendQuery),
    queryKey: adminStaffQueryKey(backendQuery),
  });
  const locationsQuery = useQuery({
    queryFn: () => fetchAdminLocations(LOCATION_FILTER_QUERY),
    queryKey: adminLocationsQueryKey(LOCATION_FILTER_QUERY),
    staleTime: 60_000,
  });

  const totalPages = getPageCount(staffQuery.data?.totalCount ?? 0, pageSize);
  const safePage = Math.min(page, totalPages);
  const hasFilters =
    status !== "all" || role !== "all" || !!(query + locationSlug);
  const sorting: AppDataTableSort = { columnId: sort, direction: dir };

  useEffect(() => {
    if (!staffQuery.data || safePage === page) return;
    replaceUserQuery(router, pathname, searchParams, {
      page: safePage === 1 ? null : safePage,
    });
  }, [page, pathname, router, safePage, searchParams, staffQuery.data]);

  return (
    <PageShell>
      <PageHeader
        description="Managers and workers across every location with server-side role, status, and location filters."
        title="Staff"
      />
      <AdminStaffFilters
        draftSearch={draftSearch}
        hasFilters={hasFilters}
        locationSlug={locationSlug}
        locations={locationsQuery.data?.items ?? []}
        onClear={() =>
          replaceUserQuery(router, pathname, searchParams, {
            locationSlug: null,
            page: null,
            q: null,
            role: null,
            status: null,
          })
        }
        onLocationChange={(nextLocationSlug) =>
          replaceUserQuery(router, pathname, searchParams, {
            locationSlug: nextLocationSlug || null,
            page: null,
          })
        }
        onRoleChange={(nextRole) =>
          replaceUserQuery(router, pathname, searchParams, {
            page: null,
            role: nextRole === "all" ? null : nextRole,
          })
        }
        onSearchChange={setDraftSearch}
        onStatusChange={(nextStatus) =>
          replaceUserQuery(router, pathname, searchParams, {
            page: null,
            status: nextStatus === "all" ? null : nextStatus,
          })
        }
        role={role}
        status={status}
        totalCount={staffQuery.data?.totalCount ?? 0}
      />

      {staffQuery.isPending && !staffQuery.data ? (
        <div className="flex flex-col gap-2">
          {USER_TABLE_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-11 w-full" />
          ))}
        </div>
      ) : (
        <>
          {staffQuery.isError ? (
            <AppErrorBanner
              detail={getUsersErrorMessage(staffQuery.error)}
              error={staffQuery.error}
              onRetry={() => {
                void staffQuery.refetch();
              }}
              title="Unable to load staff"
            />
          ) : null}
          <AppDataTable
            columns={userTableColumns}
            data={staffQuery.data?.items ?? []}
            density="compact"
            emptyDescription={
              hasFilters
                ? "Try adjusting the staff filters or search term."
                : "No manager or worker accounts were returned."
            }
            emptyTitle={hasFilters ? "No staff match" : "No staff available"}
            emptyState={{ kind: hasFilters ? "no-results" : "no-data" }}
            getRowId={(row) => row.slug}
            onRowClick={(row: { slug: string }) =>
              router.push(
                toRoute(
                  `/admin/users/${encodeURIComponent(row.slug)}` as Route,
                ),
              )
            }
            onSortingChange={(nextSorting) =>
              replaceUserQuery(router, pathname, searchParams, {
                dir: nextSorting?.direction ?? null,
                page: null,
                sort: nextSorting?.columnId ?? null,
              })
            }
            pagination={{
              onPageChange: (nextPage) =>
                replaceUserQuery(router, pathname, searchParams, {
                  page: nextPage === 1 ? null : nextPage,
                }),
              onPageSizeChange: (nextPageSize) =>
                replaceUserQuery(router, pathname, searchParams, {
                  page: null,
                  pageSize: nextPageSize === 10 ? null : nextPageSize,
                }),
              page: safePage,
              pageSize,
              pageSizeOptions: USER_PAGE_SIZE_OPTIONS,
              totalCount: staffQuery.data?.totalCount ?? 0,
            }}
            sorting={sorting}
          />
        </>
      )}
    </PageShell>
  );
}
