"use client";

import { useQuery } from "@tanstack/react-query";
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
import { SupplierFilters } from "./supplier-filters";
import { supplierColumns } from "./suppliers-columns";
import {
  createSupplierQuery,
  getSuppliersErrorMessage,
  replaceSuppliersQuery,
  SUPPLIER_PAGE_SIZE_OPTIONS,
  SUPPLIER_TABLE_SKELETON_KEYS,
} from "./suppliers-page-client.support";

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
  const pageSize = SUPPLIER_PAGE_SIZE_OPTIONS.includes(
    rawPageSize as (typeof SUPPLIER_PAGE_SIZE_OPTIONS)[number],
  )
    ? rawPageSize
    : 10;
  const page = readPositiveIntParam(searchParams, "page", 1);

  useEffect(() => setDraftSearch(query), [query]);

  useEffect(() => {
    if (draftSearch === query) return;
    const id = window.setTimeout(() => {
      replaceSuppliersQuery(router, pathname, searchParams, {
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
    replaceSuppliersQuery(router, pathname, searchParams, {
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
      <SupplierFilters
        draftSearch={draftSearch}
        hasFilters={hasFilters}
        onClear={() =>
          replaceSuppliersQuery(router, pathname, searchParams, {
            page: null,
            q: null,
            status: null,
          })
        }
        onDraftSearchChange={setDraftSearch}
        onStatusChange={(val) =>
          replaceSuppliersQuery(router, pathname, searchParams, {
            page: null,
            status: val === "all" ? null : val,
          })
        }
        status={status}
        totalCount={suppliersQuery.data?.totalCount ?? 0}
      />

      <AppTableWrapper>
        {suppliersQuery.isPending && !suppliersQuery.data ? (
          <StockWorkspaceTableSkeleton keys={SUPPLIER_TABLE_SKELETON_KEYS} />
        ) : (
          <>
            {suppliersQuery.isError ? (
              <div className="p-8">
                <AppErrorBanner
                  detail={getSuppliersErrorMessage(suppliersQuery.error)}
                  error={suppliersQuery.error}
                  onRetry={() => {
                    void suppliersQuery.refetch();
                  }}
                  title="Unable to load suppliers"
                />
              </div>
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
                replaceSuppliersQuery(router, pathname, searchParams, {
                  dir: next?.direction ?? null,
                  page: null,
                  sort: next?.columnId ?? null,
                })
              }
              pagination={{
                onPageChange: (next) =>
                  replaceSuppliersQuery(router, pathname, searchParams, {
                    page: next === 1 ? null : next,
                  }),
                onPageSizeChange: (next) =>
                  replaceSuppliersQuery(router, pathname, searchParams, {
                    page: null,
                    pageSize: next === 10 ? null : next,
                  }),
                page: safePage,
                pageSize,
                pageSizeOptions: SUPPLIER_PAGE_SIZE_OPTIONS,
                totalCount: suppliersQuery.data?.totalCount ?? 0,
              }}
              sorting={sorting}
            />
          </>
        )}
      </AppTableWrapper>
    </PageShell>
  );
}
