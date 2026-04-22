"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getUsersErrorMessage,
  replaceUserQuery,
  USER_PAGE_SIZE_OPTIONS,
  USER_TABLE_SKELETON_KEYS,
} from "@/components/admin/users/users-page-client.support";
import {
  AppDataTable,
  type AppDataTableSort,
} from "@/components/data-table/app-data-table";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { PermissionGate } from "@/components/system/permission-gate";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminSuppliersQueryKey,
  fetchAdminSuppliers,
} from "@/lib/react-query/admin-directory";
import { toRoute } from "@/lib/routes";
import {
  getPageCount,
  readEnumParam,
  readPositiveIntParam,
  readStringParam,
} from "@/lib/url-state";
import { supplierColumns } from "./suppliers-columns";
import { createSupplierQuery } from "./suppliers-page-client.support";

const SORT_OPTIONS = ["name", "status", "createdAt"] as const;
const SUPPLIER_STATUS_FILTER_OPTIONS = ["all", "active", "inactive"] as const;

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
    SUPPLIER_STATUS_FILTER_OPTIONS,
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
    () =>
      createSupplierQuery({
        dir,
        page,
        pageSize,
        q: query,
        sort,
        status,
      }),
    [dir, page, pageSize, query, sort, status],
  );

  const suppliersQuery = useQuery({
    placeholderData: (prev) => prev,
    queryFn: () => fetchAdminSuppliers(backendQuery),
    queryKey: adminSuppliersQueryKey(backendQuery),
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
        actions={
          <PermissionGate permission="suppliers.manage">
            <Link
              className={buttonVariants({ size: "sm" })}
              href={toRoute("/admin/suppliers/new")}
            >
              New supplier
            </Link>
          </PermissionGate>
        }
        description="Supplier organizations, primary contacts, payment terms, and linked portal access."
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
          <option value="inactive">Inactive</option>
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
            <AppErrorBanner
              detail={getUsersErrorMessage(suppliersQuery.error)}
              error={suppliersQuery.error}
              onRetry={() => {
                void suppliersQuery.refetch();
              }}
              title="Unable to load suppliers"
            />
          ) : null}
          <AppDataTable
            columns={supplierColumns}
            data={suppliersQuery.data?.items ?? []}
            density="compact"
            emptyDescription={
              hasFilters
                ? "Try adjusting the filters or search term."
                : "No supplier organizations have been created yet."
            }
            emptyTitle={hasFilters ? "No suppliers match" : "No suppliers"}
            emptyState={{ kind: hasFilters ? "no-results" : "no-data" }}
            getRowId={(row) => row.slug}
            onRowClick={(row) =>
              router.push(
                toRoute(`/admin/suppliers/${encodeURIComponent(row.slug)}`),
              )
            }
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
