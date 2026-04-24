"use client";
import type { AdminProductListQuery } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
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
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminProductsQueryKey,
  fetchAdminProducts,
  updateAdminProduct,
} from "@/lib/react-query/admin-catalog-products";
import { toRoute } from "@/lib/routes";
import {
  getPageCount,
  readEnumParam,
  readPositiveIntParam,
  readStringParam,
} from "@/lib/url-state";
import { createCatalogBulkActions } from "../catalog-bulk-status-actions";
import { ProductFilters } from "./product-filters";
import { productTableColumns } from "./product-table-columns";
import {
  getProductsErrorMessage,
  PRODUCT_PAGE_SIZE_OPTIONS,
  PRODUCT_SKELETON_KEYS,
  PRODUCT_SORT_OPTIONS,
  PRODUCT_STATUS_OPTIONS,
  replaceProductQuery,
} from "./products-page-client.support";
export function ProductsPageClient() {
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
    PRODUCT_SORT_OPTIONS,
    "name",
  );
  const dir = readEnumParam(searchParams, "dir", ["asc", "desc"], "asc");
  const status = readEnumParam(
    searchParams,
    "status",
    PRODUCT_STATUS_OPTIONS,
    "all",
  );
  const brandSlug = readStringParam(searchParams, "brandSlug");
  const categorySlug = readStringParam(searchParams, "categorySlug");
  const rawPageSize = readPositiveIntParam(searchParams, "pageSize", 20);
  const pageSize = PRODUCT_PAGE_SIZE_OPTIONS.includes(
    rawPageSize as (typeof PRODUCT_PAGE_SIZE_OPTIONS)[number],
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
      replaceProductQuery(router, pathname, searchParams, {
        page: null,
        q: draftSearch || null,
      });
    }, 350);

    return () => window.clearTimeout(id);
  }, [draftSearch, pathname, q, router, searchParams]);
  const backendQuery = useMemo<AdminProductListQuery>(
    () => ({ brandSlug, categorySlug, dir, page, pageSize, q, sort, status }),
    [brandSlug, categorySlug, dir, page, pageSize, q, sort, status],
  );
  const productsQuery = useQuery({
    placeholderData: (prev) => prev,
    queryFn: () => fetchAdminProducts(backendQuery),
    queryKey: adminProductsQueryKey(backendQuery),
  });
  const totalCount = productsQuery.data?.totalCount ?? 0;
  const totalPages = getPageCount(totalCount, pageSize);
  const safePage = Math.min(page, totalPages);
  const hasFilters =
    q !== "" || status !== "all" || brandSlug !== "" || categorySlug !== "";
  const sorting: AppDataTableSort = { columnId: sort, direction: dir };
  const canManage = can("catalog.products.manage");
  useEffect(() => {
    if (!productsQuery.data || safePage === page) return;
    replaceProductQuery(router, pathname, searchParams, {
      page: safePage === 1 ? null : safePage,
    });
  }, [productsQuery.data, page, pathname, router, safePage, searchParams]);
  return (
    <PageShell>
      <PageHeader
        actions={
          <PermissionGate permission="catalog.products.manage">
            <Link
              className={buttonVariants({ size: "sm" })}
              href={toRoute("/admin/products/new")}
            >
              New product
            </Link>
          </PermissionGate>
        }
        description="Browse and manage products and their variants across the catalogue."
        title="Products"
      />
      <ProductFilters
        brandSlug={brandSlug}
        categorySlug={categorySlug}
        draftSearch={draftSearch}
        hasFilters={hasFilters}
        onDraftSearchChange={setDraftSearch}
        onQueryChange={(updates) =>
          replaceProductQuery(router, pathname, searchParams, updates)
        }
        status={status}
        totalCount={totalCount}
      />

      {productsQuery.isPending && !productsQuery.data ? (
        <div className="flex flex-col gap-2">
          {PRODUCT_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-11 w-full" />
          ))}
        </div>
      ) : (
        <>
          {productsQuery.isError ? (
            <AppErrorBanner
              detail={getProductsErrorMessage(productsQuery.error)}
              error={productsQuery.error}
              onRetry={() => {
                void productsQuery.refetch();
              }}
              title="Unable to load products"
            />
          ) : null}
          <AppDataTable
            bulkActions={createCatalogBulkActions({
              canManage,
              entityLabelPlural: "Products",
              queryKey: adminProductsQueryKey(backendQuery),
              selectionAriaLabel: "product",
              updateStatus: (row, targetStatus) =>
                updateAdminProduct(row.slug, { status: targetStatus }),
            })}
            columns={productTableColumns}
            data={productsQuery.data?.items ?? []}
            density="compact"
            emptyDescription={
              hasFilters
                ? "Try adjusting the current filters or search term."
                : "No products have been created yet."
            }
            emptyTitle={hasFilters ? "No products match" : "No products yet"}
            emptyState={{ kind: hasFilters ? "no-results" : "no-data" }}
            getRowId={(row) => row.slug}
            onRowClick={(row) =>
              router.push(
                toRoute(`/admin/products/${encodeURIComponent(row.slug)}`),
              )
            }
            onSortingChange={(next) =>
              replaceProductQuery(router, pathname, searchParams, {
                dir: next?.direction ?? null,
                page: null,
                sort: next?.columnId ?? null,
              })
            }
            pagination={{
              onPageChange: (next) =>
                replaceProductQuery(router, pathname, searchParams, {
                  page: next === 1 ? null : next,
                }),
              onPageSizeChange: (next) =>
                replaceProductQuery(router, pathname, searchParams, {
                  page: null,
                  pageSize: next === 20 ? null : next,
                }),
              page: safePage,
              pageSize,
              pageSizeOptions: PRODUCT_PAGE_SIZE_OPTIONS,
              totalCount,
            }}
            sorting={sorting}
          />
        </>
      )}
    </PageShell>
  );
}
