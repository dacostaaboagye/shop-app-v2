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
  adminCustomersQueryKey,
  fetchAdminCustomers,
} from "@/lib/react-query/admin-directory";
import { toRoute } from "@/lib/routes";
import {
  getPageCount,
  readEnumParam,
  readPositiveIntParam,
  readStringParam,
} from "@/lib/url-state";
import { customerColumns } from "./customer-columns";
import { CustomerFilters } from "./customer-filters";
import {
  CUSTOMER_PAGE_SIZE_OPTIONS,
  CUSTOMER_TABLE_SKELETON_KEYS,
  createCustomerQuery,
  getCustomersErrorMessage,
  replaceCustomersQuery,
} from "./customers-page-support";

const SORT_OPTIONS = ["displayName", "status", "createdAt"] as const;
const STATUS_OPTIONS = ["all", "active", "inactive", "blocked"] as const;
const TYPE_OPTIONS = ["all", "individual", "business"] as const;

export function CustomersPageClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = readStringParam(searchParams, "q");
  const [draftSearch, setDraftSearch] = useState(query);
  const status = readEnumParam(searchParams, "status", STATUS_OPTIONS, "all");
  const type = readEnumParam(searchParams, "type", TYPE_OPTIONS, "all");
  const sort = readEnumParam(searchParams, "sort", SORT_OPTIONS, "displayName");
  const dir = readEnumParam(searchParams, "dir", ["asc", "desc"], "asc");
  const rawPageSize = readPositiveIntParam(searchParams, "pageSize", 10);
  const pageSize = CUSTOMER_PAGE_SIZE_OPTIONS.includes(
    rawPageSize as (typeof CUSTOMER_PAGE_SIZE_OPTIONS)[number],
  )
    ? rawPageSize
    : 10;
  const page = readPositiveIntParam(searchParams, "page", 1);

  useEffect(() => setDraftSearch(query), [query]);
  useEffect(() => {
    if (draftSearch === query) return;
    const id = window.setTimeout(() => {
      replaceCustomersQuery(router, pathname, searchParams, {
        page: null,
        q: draftSearch || null,
      });
    }, 350);
    return () => window.clearTimeout(id);
  }, [draftSearch, pathname, query, router, searchParams]);

  const backendQuery = useMemo(
    () =>
      createCustomerQuery({
        dir,
        page,
        pageSize,
        q: query,
        sort,
        status,
        type,
      }),
    [dir, page, pageSize, query, sort, status, type],
  );
  const customersQuery = useQuery({
    placeholderData: (prev) => prev,
    queryFn: () => fetchAdminCustomers(backendQuery),
    queryKey: adminCustomersQueryKey(backendQuery),
  });
  const totalPages = getPageCount(
    customersQuery.data?.totalCount ?? 0,
    pageSize,
  );
  const safePage = Math.min(page, totalPages);
  const hasFilters = status !== "all" || type !== "all" || !!query;
  const sorting: AppDataTableSort = { columnId: sort, direction: dir };

  useEffect(() => {
    if (!customersQuery.data || safePage === page) return;
    replaceCustomersQuery(router, pathname, searchParams, {
      page: safePage === 1 ? null : safePage,
    });
  }, [customersQuery.data, page, pathname, router, safePage, searchParams]);

  return (
    <PageShell>
      <PageHeader
        actions={
          <PermissionGate permission="customers.manage">
            <Link
              className={buttonVariants({ size: "sm" })}
              href={toRoute("/admin/customers/new")}
            >
              New customer
            </Link>
          </PermissionGate>
        }
        description="Trusted customer records, contacts, billing context, and relationship history for sales and support."
        title="Customers"
      />
      <CustomerFilters
        draftSearch={draftSearch}
        hasFilters={hasFilters}
        onClear={() =>
          replaceCustomersQuery(router, pathname, searchParams, {
            page: null,
            q: null,
            status: null,
            type: null,
          })
        }
        onDraftSearchChange={setDraftSearch}
        onStatusChange={(value) =>
          replaceCustomersQuery(router, pathname, searchParams, {
            page: null,
            status: value === "all" ? null : value,
          })
        }
        onTypeChange={(value) =>
          replaceCustomersQuery(router, pathname, searchParams, {
            page: null,
            type: value === "all" ? null : value,
          })
        }
        status={status}
        totalCount={customersQuery.data?.totalCount ?? 0}
        type={type}
      />
      <AppTableWrapper>
        {customersQuery.isPending && !customersQuery.data ? (
          <StockWorkspaceTableSkeleton keys={CUSTOMER_TABLE_SKELETON_KEYS} />
        ) : (
          <>
            {customersQuery.isError ? (
              <div className="p-8">
                <AppErrorBanner
                  detail={getCustomersErrorMessage(customersQuery.error)}
                  error={customersQuery.error}
                  onRetry={() => void customersQuery.refetch()}
                  title="Unable to load customers"
                />
              </div>
            ) : null}
            <AppDataTable
              columns={customerColumns}
              data={customersQuery.data?.items ?? []}
              density="compact"
              emptyDescription={
                hasFilters
                  ? "Try adjusting the filters or search term."
                  : "Create the first trusted customer record before linking invoices, orders, and portal access."
              }
              emptyTitle={hasFilters ? "No customers match" : "No customers"}
              emptyState={{ kind: hasFilters ? "no-results" : "no-data" }}
              getRowId={(row) => row.slug}
              onRowClick={(row) =>
                router.push(
                  toRoute(`/admin/customers/${encodeURIComponent(row.slug)}`),
                )
              }
              onSortingChange={(next) =>
                replaceCustomersQuery(router, pathname, searchParams, {
                  dir: next?.direction ?? null,
                  page: null,
                  sort: next?.columnId ?? null,
                })
              }
              pagination={{
                onPageChange: (next) =>
                  replaceCustomersQuery(router, pathname, searchParams, {
                    page: next === 1 ? null : next,
                  }),
                onPageSizeChange: (next) =>
                  replaceCustomersQuery(router, pathname, searchParams, {
                    page: null,
                    pageSize: next === 10 ? null : next,
                  }),
                page: safePage,
                pageSize,
                pageSizeOptions: CUSTOMER_PAGE_SIZE_OPTIONS,
                totalCount: customersQuery.data?.totalCount ?? 0,
              }}
              sorting={sorting}
            />
          </>
        )}
      </AppTableWrapper>
    </PageShell>
  );
}
