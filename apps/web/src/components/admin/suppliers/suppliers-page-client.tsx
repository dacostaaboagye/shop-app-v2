"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import {
  getPageCount,
  readEnumParam,
  readPositiveIntParam,
  readStringParam,
} from "@/lib/url-state";
import {
  getUsersErrorMessage,
  replaceUserQuery,
  USER_PAGE_SIZE_OPTIONS,
  USER_STATUS_FILTER_OPTIONS,
  USER_TABLE_SKELETON_KEYS,
} from "@/components/admin/users/users-page-client.support";
import { supplierColumns } from "./suppliers-columns";

const SORT_OPTIONS = ["name", "status", "createdAt"] as const;

export function SuppliersPageClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [draftSearch, setDraftSearch] = useState(
    readStringParam(searchParams, "q"),
  );
  const query = readStringParam(searchParams, "q");
  const status = readEnumParam(
    searchParams,
    "status",
    USER_STATUS_FILTER_OPTIONS,
    "all",
  );
  const sort = readEnumParam(searchParams, "sort", SORT_OPTIONS, "name");
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
    const id = window.setTimeout(() => {
      replaceUserQuery(router, pathname, searchParams, {
        page: null,
        q: draftSearch || null,
      });
    }, 350);
    return () => window.clearTimeout(id);
  }, [draftSearch, pathname, query, router, searchParams]);

  const backendQuery = useMemo(
    () => ({
      dir,
      locationSlug: "",
      page,
      pageSize,
      q: query,
      role: "supplier",
      sort,
      status,
    }),
    [dir, page, pageSize, query, sort, status],
  );

  const suppliersQuery = useQuery({
    placeholderData: (prev) => prev,
    queryFn: () => fetchAdminUsers(backendQuery),
    queryKey: adminUsersQueryKey(backendQuery),
  });

  const totalPages = getPageCount(
    suppliersQuery.data?.totalCount ?? 0,
    pageSize,
  );
  const safePage = Math.min(page, totalPages);
  const hasFilters = status !== "all" || !!query;
  const sorting: AppDataTableSort = { columnId: sort, direction: dir };

  useEffect(() => {
    if (!suppliersQuery.data || safePage === page) return;
    replaceUserQuery(router, pathname, searchParams, {
      page: safePage === 1 ? null : safePage,
    });
  }, [page, pathname, router, safePage, searchParams, suppliersQuery.data]);

  return (
    <PageShell>
      <PageHeader
        description="Supplier accounts with catalogue access and purchase relationships."
        title="Suppliers"
      />
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-9"
            onChange={(e) => setDraftSearch(e.target.value)}
            placeholder="Search name or email"
            value={draftSearch}
          />
        </div>
        <Select
          aria-label="Filter by status"
          className="h-9"
          onChange={(e) =>
            replaceUserQuery(router, pathname, searchParams, {
              page: null,
              status: e.target.value === "all" ? null : e.target.value,
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
                page: null,
                q: null,
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
        <span className="ml-auto tabular-nums text-sm text-muted-foreground">
          {suppliersQuery.data?.totalCount ?? 0} total
        </span>
      </div>

      {suppliersQuery.isPending && !suppliersQuery.data ? (
        <div className="flex flex-col gap-2">
          {USER_TABLE_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-11 w-full" />
          ))}
        </div>
      ) : (
        <>
          {suppliersQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load suppliers</AlertTitle>
              <AlertDescription>
                {getUsersErrorMessage(suppliersQuery.error)}
              </AlertDescription>
            </Alert>
          ) : null}
          <AppDataTable
            columns={supplierColumns}
            data={suppliersQuery.data?.items ?? []}
            density="compact"
            emptyDescription={
              hasFilters
                ? "Try adjusting the filters or search term."
                : "No supplier accounts have been created yet."
            }
            emptyTitle={hasFilters ? "No suppliers match" : "No suppliers"}
            emptyState={{ kind: hasFilters ? "no-results" : "no-data" }}
            getRowId={(row) => row.slug}
            onSortingChange={(next) =>
              replaceUserQuery(router, pathname, searchParams, {
                dir: next?.direction ?? null,
                page: null,
                sort: next?.columnId ?? null,
              })
            }
            pagination={{
              onPageChange: (next) =>
                replaceUserQuery(router, pathname, searchParams, {
                  page: next === 1 ? null : next,
                }),
              onPageSizeChange: (next) =>
                replaceUserQuery(router, pathname, searchParams, {
                  page: null,
                  pageSize: next === 10 ? null : next,
                }),
              page: safePage,
              pageSize,
              pageSizeOptions: USER_PAGE_SIZE_OPTIONS,
              totalCount: suppliersQuery.data?.totalCount ?? 0,
            }}
            sorting={sorting}
          />
        </>
      )}
    </PageShell>
  );
}
