"use client";
import type { AdminCategoryListQuery } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AppDataTable,
  type AppDataTableSort,
} from "@/components/data-table/app-data-table";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { StockWorkspaceTableSkeleton } from "@/components/stock/stock-workspace-feedback";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { PermissionGate } from "@/components/system/permission-gate";
import { buttonVariants } from "@/components/ui/button";
import {
  adminCategoriesQueryKey,
  fetchAdminCategories,
  updateAdminCategory,
} from "@/lib/react-query/admin-catalog";
import { toRoute } from "@/lib/routes";
import {
  getPageCount,
  readEnumParam,
  readPositiveIntParam,
  readStringParam,
} from "@/lib/url-state";
import { createCatalogBulkActions } from "../catalog-bulk-status-actions";
import {
  CATEGORY_PAGE_SIZE_OPTIONS,
  CATEGORY_SKELETON_KEYS,
  CATEGORY_SORT_OPTIONS,
  CATEGORY_STATUS_OPTIONS,
  getCategoriesErrorMessage,
  replaceCategoryQuery,
} from "./categories-page-client.support";
import { CategoryFilters } from "./category-filters";
import { categoryTableColumns } from "./category-table-columns";
export function CategoriesPageClient() {
  const { can } = useAuthorization();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftSearch, setDraftSearch] = useState(
    readStringParam(searchParams, "q"),
  );
  const q = readStringParam(searchParams, "q");
  const sort = readEnumParam(
    searchParams,
    "sort",
    CATEGORY_SORT_OPTIONS,
    "name",
  );
  const dir = readEnumParam(searchParams, "dir", ["asc", "desc"], "asc");
  const status = readEnumParam(
    searchParams,
    "status",
    CATEGORY_STATUS_OPTIONS,
    "all",
  );
  const rawPageSize = readPositiveIntParam(searchParams, "pageSize", 20);
  const pageSize = CATEGORY_PAGE_SIZE_OPTIONS.includes(
    rawPageSize as (typeof CATEGORY_PAGE_SIZE_OPTIONS)[number],
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
      replaceCategoryQuery(router, pathname, searchParams, {
        page: null,
        q: draftSearch || null,
      });
    }, 350);

    return () => window.clearTimeout(id);
  }, [draftSearch, pathname, q, router, searchParams]);
  const backendQuery = useMemo<AdminCategoryListQuery>(
    () => ({ dir, page, pageSize, q, sort, status }),
    [dir, page, pageSize, q, sort, status],
  );
  const categoriesQuery = useQuery({
    placeholderData: (prev) => prev,
    queryFn: () => fetchAdminCategories(backendQuery),
    queryKey: adminCategoriesQueryKey(backendQuery),
  });
  const totalCount = categoriesQuery.data?.totalCount ?? 0;
  const totalPages = getPageCount(totalCount, pageSize);
  const safePage = Math.min(page, totalPages);
  const hasFilters = q !== "" || status !== "all";
  const sorting: AppDataTableSort = { columnId: sort, direction: dir };
  const canManage = can("catalog.categories.manage");
  useEffect(() => {
    if (!categoriesQuery.data || safePage === page) return;
    replaceCategoryQuery(router, pathname, searchParams, {
      page: safePage === 1 ? null : safePage,
    });
  }, [categoriesQuery.data, page, pathname, router, safePage, searchParams]);
  return (
    <PageShell>
      <PageHeader
        actions={
          <PermissionGate permission="catalog.categories.manage">
            <Link
              className={buttonVariants({ size: "sm" })}
              href={toRoute("/admin/products/categories/new")}
            >
              New category
            </Link>
          </PermissionGate>
        }
        description="Manage categories used to organise the product catalogue."
        title="Categories"
      />
      <CategoryFilters
        draftSearch={draftSearch}
        hasFilters={hasFilters}
        onClear={() =>
          replaceCategoryQuery(router, pathname, searchParams, {
            page: null,
            q: null,
            status: null,
          })
        }
        onDraftSearchChange={setDraftSearch}
        onStatusChange={(val) =>
          replaceCategoryQuery(router, pathname, searchParams, {
            page: null,
            status: val,
          })
        }
        status={status}
        totalCount={totalCount}
      />
      {categoriesQuery.isPending && !categoriesQuery.data ? (
        <div className="rounded-xl border border-border/60 bg-card shadow-sm">
          <StockWorkspaceTableSkeleton keys={CATEGORY_SKELETON_KEYS} />
        </div>
      ) : (
        <>
          {categoriesQuery.isError ? (
            <AppErrorBanner
              detail={getCategoriesErrorMessage(categoriesQuery.error)}
              error={categoriesQuery.error}
              onRetry={() => {
                void categoriesQuery.refetch();
              }}
              title="Unable to load categories"
            />
          ) : null}
          <AppDataTable
            bulkActions={createCatalogBulkActions({
              canManage,
              entityLabelPlural: "Categories",
              queryKey: adminCategoriesQueryKey(backendQuery),
              selectionAriaLabel: "category",
              updateStatus: (row, targetStatus) =>
                updateAdminCategory(row.slug, { status: targetStatus }),
            })}
            columns={categoryTableColumns}
            data={categoriesQuery.data?.items ?? []}
            density="compact"
            emptyDescription={
              hasFilters
                ? "Try adjusting the current filters or search term."
                : "No categories have been created yet."
            }
            emptyTitle={
              hasFilters ? "No categories match" : "No categories yet"
            }
            emptyState={{ kind: hasFilters ? "no-results" : "no-data" }}
            getRowId={(row) => row.slug}
            onRowClick={(row) =>
              router.push(
                toRoute(
                  `/admin/products/categories/${encodeURIComponent(row.slug)}`,
                ),
              )
            }
            onSortingChange={(next) =>
              replaceCategoryQuery(router, pathname, searchParams, {
                dir: next?.direction ?? null,
                page: null,
                sort: next?.columnId ?? null,
              })
            }
            pagination={{
              onPageChange: (next) =>
                replaceCategoryQuery(router, pathname, searchParams, {
                  page: next === 1 ? null : next,
                }),
              onPageSizeChange: (next) =>
                replaceCategoryQuery(router, pathname, searchParams, {
                  page: null,
                  pageSize: next === 20 ? null : next,
                }),
              page: safePage,
              pageSize,
              pageSizeOptions: CATEGORY_PAGE_SIZE_OPTIONS,
              totalCount,
            }}
            sorting={sorting}
          />
        </>
      )}
    </PageShell>
  );
}
