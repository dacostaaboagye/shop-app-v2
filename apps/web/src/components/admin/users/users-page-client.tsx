"use client";

import type { AdminUserListQuery } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AppDataTable,
  type AppDataTableSort,
} from "@/components/data-table/app-data-table";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminUsersQueryKey,
  fetchAdminUsers,
} from "@/lib/react-query/admin-directory";
import { toRoute } from "@/lib/routes";
import {
  getPageCount,
  readEnumParam,
  readPositiveIntParam,
  readStringParam,
} from "@/lib/url-state";
import { userTableColumns } from "./user-table-columns";
import {
  getUsersErrorMessage,
  replaceUserQuery,
  USER_PAGE_SIZE_OPTIONS,
  USER_SORT_OPTIONS,
  USER_STATUS_FILTER_OPTIONS,
  USER_TABLE_SKELETON_KEYS,
  type UsersPageClientProps,
} from "./users-page-client.support";

export function UsersPageClient({
  description = "Backend-backed directory with URL-synced filters and server pagination.",
  title = "Users",
  userDetailBasePath,
}: UsersPageClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftSearch, setDraftSearch] = useState(
    readStringParam(searchParams, "q"),
  );
  const locationSlug = readStringParam(searchParams, "locationSlug");
  const query = readStringParam(searchParams, "q");
  const role = readStringParam(searchParams, "role");
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
    if (draftSearch === query) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      replaceUserQuery(router, pathname, searchParams, {
        page: null,
        q: draftSearch || null,
      });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [draftSearch, pathname, query, router, searchParams]);

  const backendQuery = useMemo<AdminUserListQuery>(
    () => ({ dir, locationSlug, page, pageSize, q: query, role, sort, status }),
    [dir, locationSlug, page, pageSize, query, role, sort, status],
  );
  const usersQuery = useQuery({
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchAdminUsers(backendQuery),
    queryKey: adminUsersQueryKey(backendQuery),
  });
  const totalPages = getPageCount(usersQuery.data?.totalCount ?? 0, pageSize);
  const safePage = Math.min(page, totalPages);
  const hasFilters = status !== "all" || !!(query + role + locationSlug);
  const sorting: AppDataTableSort = { columnId: sort, direction: dir };
  useEffect(() => {
    if (!usersQuery.data || safePage === page) {
      return;
    }
    replaceUserQuery(router, pathname, searchParams, {
      page: safePage === 1 ? null : safePage,
    });
  }, [page, pathname, router, safePage, searchParams, usersQuery.data]);
  return (
    <PageShell>
      <PageHeader description={description} title={title} />
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-9"
            onChange={(event) => setDraftSearch(event.target.value)}
            placeholder="Search name or email"
            value={draftSearch}
          />
        </div>
        <Select
          aria-label="Filter by role"
          className="h-9"
          onChange={(event) =>
            replaceUserQuery(router, pathname, searchParams, {
              page: null,
              role: event.target.value || null,
            })
          }
          value={role}
        >
          <option value="">All roles</option>
          {usersQuery.data?.availableRoles.map((roleOption) => (
            <option key={roleOption.slug} value={roleOption.slug}>
              {roleOption.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by status"
          className="h-9"
          onChange={(event) =>
            replaceUserQuery(router, pathname, searchParams, {
              page: null,
              status: event.target.value === "all" ? null : event.target.value,
            })
          }
          value={status}
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deactivated">Deactivated</option>
        </Select>
        {hasFilters ? (
          <Button
            onClick={() =>
              replaceUserQuery(router, pathname, searchParams, {
                locationSlug: null,
                page: null,
                q: null,
                role: null,
                status: null,
              })
            }
            size="sm"
            type="button"
            variant="ghost"
          >
            <X data-icon="inline-start" />
            Clear
          </Button>
        ) : null}
        <span className="ml-auto text-sm tabular-nums text-muted-foreground">
          {usersQuery.data?.totalCount ?? 0} total
        </span>
      </div>

      {usersQuery.isPending && !usersQuery.data ? (
        <div className="flex flex-col gap-2">
          {USER_TABLE_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-11 w-full" />
          ))}
        </div>
      ) : (
        <>
          {usersQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load users</AlertTitle>
              <AlertDescription>
                {getUsersErrorMessage(usersQuery.error)}
              </AlertDescription>
            </Alert>
          ) : null}
          <AppDataTable
            columns={userTableColumns}
            data={usersQuery.data?.items ?? []}
            density="compact"
            emptyDescription={
              hasFilters
                ? "Try adjusting the current URL filters or search term."
                : "No users were returned from the current backend dataset."
            }
            emptyTitle={hasFilters ? "No users match" : "No users available"}
            emptyState={{
              kind: hasFilters ? "no-results" : "no-data",
            }}
            getRowId={(row) => row.slug}
            {...(userDetailBasePath
              ? {
                  onRowClick: (row: { slug: string }) =>
                    router.push(
                      toRoute(
                        `${userDetailBasePath}/${encodeURIComponent(row.slug)}` as Route,
                      ),
                    ),
                }
              : {})}
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
              totalCount: usersQuery.data?.totalCount ?? 0,
            }}
            sorting={sorting}
          />
        </>
      )}
    </PageShell>
  );
}
