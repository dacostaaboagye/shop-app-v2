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
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      
      {/* Sovereign Control Surface */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4 shadow-xl shadow-black/[0.02] border border-slate-200/50">
          <div className="relative min-w-[320px] flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-10 border-0 bg-slate-50 pl-10 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary/20 transition-all rounded-xl"
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="Search name, email, or role..."
              value={draftSearch}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Select
              onValueChange={(value) =>
                replaceUserQuery(router, pathname, searchParams, {
                  page: null,
                  role: value === "all" ? null : value,
                })
              }
              value={role || "all"}
            >
              <SelectTrigger className="min-w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {usersQuery.data?.availableRoles.map((roleOption) => (
                  <SelectItem key={roleOption.slug} value={roleOption.slug}>
                    {roleOption.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              onValueChange={(value) =>
                replaceUserQuery(router, pathname, searchParams, {
                  page: null,
                  status: value === "all" ? null : value,
                })
              }
              value={status || "all"}
            >
              <SelectTrigger className="min-w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="deactivated">Deactivated</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
              className="h-10 rounded-xl px-4 text-slate-400 hover:text-slate-900 hover:bg-slate-50"
            >
              <X className="mr-2 size-4" />
              Clear filters
            </Button>
          ) : null}
          
          <div className="ml-auto flex items-center gap-3 pr-2">
            <div className="h-4 w-px bg-slate-200" />
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400 tabular-nums">
              {usersQuery.data?.totalCount ?? 0} total
            </span>
          </div>
        </div>

        {/* Sovereign Table Surface */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-black/[0.03] border border-slate-200/50">
          {usersQuery.isPending && !usersQuery.data ? (
            <div className="flex flex-col gap-1 p-4">
              {USER_TABLE_SKELETON_KEYS.map((key) => (
                <Skeleton key={key} className="h-12 w-full rounded-lg" />
              ))}
            </div>
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
        </div>
      </div>
    </PageShell>
  );
}
