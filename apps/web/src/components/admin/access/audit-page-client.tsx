"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  ShieldAlert,
  SlidersHorizontal,
  UserCheck,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { AdminDirectoryFilterPanel } from "@/components/admin/admin-directory-filter-panel";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { StockWorkspaceTableSkeleton } from "@/components/stock/stock-workspace-feedback";
import { AppErrorBanner } from "@/components/system/app-error";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCount } from "@/lib/display/format";
import {
  adminAuditQueryKey,
  fetchAdminAudit,
} from "@/lib/react-query/admin-access";
import { getPageCount, readPositiveIntParam } from "@/lib/url-state";
import {
  AUDIT_PAGE_SIZE_OPTIONS,
  AUDIT_SKELETON_KEYS,
  getAuditEntryRowKey,
  getAuditErrorMessage,
  replaceAuditQuery,
} from "./audit-page-client.support";
import { auditTableColumns } from "./audit-table-columns";

export function AuditPageClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawPageSize = readPositiveIntParam(searchParams, "pageSize", 25);
  const pageSize = AUDIT_PAGE_SIZE_OPTIONS.includes(
    rawPageSize as (typeof AUDIT_PAGE_SIZE_OPTIONS)[number],
  )
    ? rawPageSize
    : 25;
  const page = readPositiveIntParam(searchParams, "page", 1);
  const auditQuery = useQuery({
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchAdminAudit({ page, pageSize }),
    queryKey: adminAuditQueryKey({ page, pageSize }),
  });
  const totalPages = getPageCount(auditQuery.data?.totalCount ?? 0, pageSize);
  const safePage = Math.min(page, totalPages);
  const overrideEvents =
    auditQuery.data?.items.filter((entry) =>
      entry.action.startsWith("override"),
    ).length ?? 0;
  const roleEvents =
    auditQuery.data?.items.filter((entry) => entry.action.startsWith("role"))
      .length ?? 0;

  useEffect(() => {
    if (!auditQuery.data || safePage === page) {
      return;
    }

    replaceAuditQuery(router, pathname, searchParams, {
      page: safePage === 1 ? null : safePage,
    });
  }, [auditQuery.data, page, pathname, router, safePage, searchParams]);

  return (
    <PageShell>
      <PageHeader
        description="Append-only access history for role assignments, revocations, and user-specific overrides."
        title="Audit log"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="All recorded access-control events."
          icon={ClipboardList}
          label="Total events"
          value={auditQuery.data?.totalCount ?? 0}
        />
        <StatCard
          description="Override changes visible on the current page."
          icon={ShieldAlert}
          label="Visible overrides"
          value={overrideEvents}
        />
        <StatCard
          description="Role assignment changes visible on the current page."
          icon={UserCheck}
          label="Visible role events"
          value={roleEvents}
        />
        <StatCard
          description="Page size currently used for log review."
          icon={SlidersHorizontal}
          label="Rows per page"
          value={pageSize}
        />
      </div>

      <AdminDirectoryFilterPanel
        extraControls={
          <div className="flex min-w-40 flex-col gap-1.5">
            <Label htmlFor="audit-filter-page-size">Rows per page</Label>
            <Select
              onValueChange={(value) =>
                replaceAuditQuery(router, pathname, searchParams, {
                  page: null,
                  pageSize: value === "25" ? null : value,
                })
              }
              value={String(pageSize)}
            >
              <SelectTrigger className="h-10" id="audit-filter-page-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIT_PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        hasFilters={false}
        hideSearch
        onClear={() => {}}
        onDraftSearchChange={() => {}}
        placeholder=""
        searchId="audit-filter-options"
        searchLabel="Review options"
        summary={`${formatCount(auditQuery.data?.totalCount ?? 0)} audit events across the append-only access history`}
        value=""
      />

      <AppTableWrapper>
        {auditQuery.isPending && !auditQuery.data ? (
          <StockWorkspaceTableSkeleton keys={AUDIT_SKELETON_KEYS} />
        ) : (
          <>
            {auditQuery.isError ? (
              <AppErrorBanner
                detail={getAuditErrorMessage(auditQuery.error)}
                error={auditQuery.error}
                onRetry={() => {
                  void auditQuery.refetch();
                }}
                title="Unable to load audit entries"
              />
            ) : null}
            <AppDataTable
              columns={auditTableColumns}
              data={auditQuery.data?.items ?? []}
              density="compact"
              emptyDescription="No access-control history has been recorded yet."
              emptyTitle="No audit entries"
              getRowId={(row) => getAuditEntryRowKey(row)}
              pagination={{
                onPageChange: (nextPage) =>
                  replaceAuditQuery(router, pathname, searchParams, {
                    page: nextPage === 1 ? null : nextPage,
                  }),
                onPageSizeChange: (nextPageSize) =>
                  replaceAuditQuery(router, pathname, searchParams, {
                    page: null,
                    pageSize: nextPageSize === 25 ? null : nextPageSize,
                  }),
                page: safePage,
                pageSize,
                pageSizeOptions: AUDIT_PAGE_SIZE_OPTIONS,
                totalCount: auditQuery.data?.totalCount ?? 0,
              }}
            />
          </>
        )}
      </AppTableWrapper>
    </PageShell>
  );
}
