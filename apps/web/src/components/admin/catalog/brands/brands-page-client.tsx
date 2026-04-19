"use client";

import type { AdminBrandListQuery } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AppDataTable,
  type AppDataTableSort,
} from "@/components/data-table/app-data-table";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { PermissionGate } from "@/components/system/permission-gate";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminBrandsQueryKey,
  fetchAdminBrands,
  updateAdminBrand,
} from "@/lib/react-query/admin-catalog";
import { toRoute } from "@/lib/routes";
import {
  getPageCount,
  readEnumParam,
  readPositiveIntParam,
  readStringParam,
} from "@/lib/url-state";
import { createCatalogBulkActions } from "../catalog-bulk-status-actions";
import { brandTableColumns } from "./brand-table-columns";
import {
  BRAND_PAGE_SIZE_OPTIONS,
  BRAND_SKELETON_KEYS,
  BRAND_SORT_OPTIONS,
  BRAND_STATUS_OPTIONS,
  getBrandsErrorMessage,
  replaceBrandQuery,
} from "./brands-page-client.support";

export function BrandsPageClient() {
  const { can } = useAuthorization();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftSearch, setDraftSearch] = useState(
    readStringParam(searchParams, "q"),
  );
  const q = readStringParam(searchParams, "q");
  const sort = readEnumParam(searchParams, "sort", BRAND_SORT_OPTIONS, "name");
  const dir = readEnumParam(searchParams, "dir", ["asc", "desc"], "asc");
  const status = readEnumParam(
    searchParams,
    "status",
    BRAND_STATUS_OPTIONS,
    "all",
  );
  const rawPageSize = readPositiveIntParam(searchParams, "pageSize", 20);
  const pageSize = BRAND_PAGE_SIZE_OPTIONS.includes(
    rawPageSize as (typeof BRAND_PAGE_SIZE_OPTIONS)[number],
  )
    ? rawPageSize
    : 20;
  const page = readPositiveIntParam(searchParams, "page", 1);

  useEffect(() => {
    setDraftSearch(q);
  }, [q]);
  useEffect(() => {
    if (draftSearch === q) return;
    const id = window.setTimeout(() => {
      replaceBrandQuery(router, pathname, searchParams, {
        page: null,
        q: draftSearch || null,
      });
    }, 350);

    return () => window.clearTimeout(id);
  }, [draftSearch, pathname, q, router, searchParams]);

  const backendQuery = useMemo<AdminBrandListQuery>(
    () => ({ dir, page, pageSize, q, sort, status }),
    [dir, page, pageSize, q, sort, status],
  );
  const brandsQuery = useQuery({
    placeholderData: (prev) => prev,
    queryFn: () => fetchAdminBrands(backendQuery),
    queryKey: adminBrandsQueryKey(backendQuery),
  });
  const totalCount = brandsQuery.data?.totalCount ?? 0;
  const totalPages = getPageCount(totalCount, pageSize);
  const safePage = Math.min(page, totalPages);
  const hasFilters = q !== "" || status !== "all";
  const sorting: AppDataTableSort = { columnId: sort, direction: dir };
  const canManage = can("catalog.brands.manage");
  useEffect(() => {
    if (!brandsQuery.data || safePage === page) return;
    replaceBrandQuery(router, pathname, searchParams, {
      page: safePage === 1 ? null : safePage,
    });
  }, [brandsQuery.data, page, pathname, router, safePage, searchParams]);
  return (
    <PageShell>
      <PageHeader
        actions={
          <PermissionGate permission="catalog.brands.manage">
            <Link
              className={buttonVariants({ size: "sm" })}
              href={toRoute("/admin/products/brands/new")}
            >
              New brand
            </Link>
          </PermissionGate>
        }
        description="Manage brand entities used across the product catalogue."
        title="Brands"
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-9"
            onChange={(e) => setDraftSearch(e.target.value)}
            placeholder="Search by name or slug"
            value={draftSearch}
          />
        </div>
        <Select
          aria-label="Filter by status"
          className="h-9"
          onChange={(e) =>
            replaceBrandQuery(router, pathname, searchParams, {
              page: null,
              status: e.target.value === "all" ? null : e.target.value,
            })
          }
          value={status}
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </Select>
        {hasFilters ? (
          <Button
            onClick={() =>
              replaceBrandQuery(router, pathname, searchParams, {
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
          {totalCount} total
        </span>
      </div>

      {brandsQuery.isPending && !brandsQuery.data ? (
        <div className="flex flex-col gap-2">
          {BRAND_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-11 w-full" />
          ))}
        </div>
      ) : (
        <>
          {brandsQuery.isError ? (
            <AppErrorBanner
              detail={getBrandsErrorMessage(brandsQuery.error)}
              error={brandsQuery.error}
              onRetry={() => {
                void brandsQuery.refetch();
              }}
              title="Unable to load brands"
            />
          ) : null}
          <AppDataTable
            bulkActions={createCatalogBulkActions({
              canManage,
              entityLabelPlural: "Brands",
              queryKey: adminBrandsQueryKey(backendQuery),
              selectionAriaLabel: "brand",
              updateStatus: (row, targetStatus) =>
                updateAdminBrand(row.slug, { status: targetStatus }),
            })}
            columns={brandTableColumns}
            data={brandsQuery.data?.items ?? []}
            density="compact"
            emptyDescription={
              hasFilters
                ? "Try adjusting the current filters or search term."
                : "No brands have been created yet."
            }
            emptyTitle={hasFilters ? "No brands match" : "No brands yet"}
            emptyState={{ kind: hasFilters ? "no-results" : "no-data" }}
            getRowId={(row) => row.slug}
            onRowClick={(row) =>
              router.push(
                toRoute(
                  `/admin/products/brands/${encodeURIComponent(row.slug)}`,
                ),
              )
            }
            onSortingChange={(next) =>
              replaceBrandQuery(router, pathname, searchParams, {
                dir: next?.direction ?? null,
                page: null,
                sort: next?.columnId ?? null,
              })
            }
            pagination={{
              onPageChange: (next) =>
                replaceBrandQuery(router, pathname, searchParams, {
                  page: next === 1 ? null : next,
                }),
              onPageSizeChange: (next) =>
                replaceBrandQuery(router, pathname, searchParams, {
                  page: null,
                  pageSize: next === 20 ? null : next,
                }),
              page: safePage,
              pageSize,
              pageSizeOptions: BRAND_PAGE_SIZE_OPTIONS,
              totalCount,
            }}
            sorting={sorting}
          />
        </>
      )}
    </PageShell>
  );
}
