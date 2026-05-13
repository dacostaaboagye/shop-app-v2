"use client";

import type { AdminUserListQuery } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AppDataTable,
  type AppDataTableSort,
} from "@/components/data-table/app-data-table";
import { StockWorkspaceTableSkeleton } from "@/components/stock/stock-workspace-feedback";
import { AppErrorBanner } from "@/components/system/app-error";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { PermissionGate } from "@/components/system/permission-gate";
import { buttonVariants } from "@/components/ui/button";
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
import { UserFilters } from "./user-filters";
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
  createHref,
  createLabel = "Create user",
  createPermission = "access.assignments.manage",
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
      <PageHeader
        actions={
          createHref ? (
            <PermissionGate permission={createPermission}>
              <Link
                className={buttonVariants({ size: "sm" })}
                href={createHref}
              >
                <Plus data-icon="inline-start" />
                {createLabel}
              </Link>
            </PermissionGate>
          ) : null
        }
        description={description}
        title={title}
      />
      <div className="flex flex-col gap-4">
        <UserFilters
          availableRoles={usersQuery.data?.availableRoles ?? []}
          draftSearch={draftSearch}
          hasFilters={hasFilters}
          onClear={() =>
            replaceUserQuery(router, pathname, searchParams, {
              locationSlug: null,
              page: null,
              q: null,
              role: null,
              status: null,
            })
          }
          onRoleChange={(value) =>
            replaceUserQuery(router, pathname, searchParams, {
              page: null,
              role: value === "all" ? null : value,
            })
          }
          onStatusChange={(value) =>
            replaceUserQuery(router, pathname, searchParams, {
              page: null,
              status: value === "all" ? null : value,
            })
          }
          role={role}
          setDraftSearch={setDraftSearch}
          status={status}
          totalCount={usersQuery.data?.totalCount ?? 0}
        />
        <AppTableWrapper>
          {usersQuery.isPending && !usersQuery.data ? (
            <StockWorkspaceTableSkeleton keys={USER_TABLE_SKELETON_KEYS} />
          ) : (
            <>
              {usersQuery.isError ? (
                <div className="p-8">
                  <AppErrorBanner
                    detail={getUsersErrorMessage(usersQuery.error)}
                    error={usersQuery.error}
                    onRetry={() => {
                      void usersQuery.refetch();
                    }}
                    title="Unable to load users"
                  />
                </div>
              ) : null}
              <AppDataTable
                columns={userTableColumns}
                data={usersQuery.data?.items ?? []}
                density="compact"
                emptyDescription={
                  hasFilters
                    ? "Try broadening the current search or filters."
                    : "No users are available in the current directory scope."
                }
                emptyTitle={hasFilters ? "No users match" : "No users yet"}
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
        </AppTableWrapper>
      </div>
    </PageShell>
  );
}
