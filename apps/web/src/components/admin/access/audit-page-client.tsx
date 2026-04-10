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
import { AppDataTable } from "@/components/data-table/app-data-table";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminAuditQueryKey,
  fetchAdminAudit,
} from "@/lib/react-query/admin-access";
import { toRoute } from "@/lib/routes";
import {
  buildSearchParams,
  getPageCount,
  readPositiveIntParam,
} from "@/lib/url-state";
import { auditTableColumns } from "./audit-table-columns";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const AUDIT_SKELETON_KEYS = [
  "audit-row-1",
  "audit-row-2",
  "audit-row-3",
  "audit-row-4",
  "audit-row-5",
  "audit-row-6",
] as const;

export function AuditPageClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawPageSize = readPositiveIntParam(searchParams, "pageSize", 25);
  const pageSize = PAGE_SIZE_OPTIONS.includes(
    rawPageSize as (typeof PAGE_SIZE_OPTIONS)[number],
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
          value={auditQuery.data?.totalCount ?? "—"}
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows</span>
          <Select
            aria-label="Rows per page"
            className="h-9"
            onChange={(event) =>
              replaceAuditQuery(router, pathname, searchParams, {
                page: null,
                pageSize:
                  event.target.value === "25" ? null : event.target.value,
              })
            }
            value={String(pageSize)}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>
        <span className="text-sm tabular-nums text-muted-foreground">
          {auditQuery.data?.totalCount ?? 0} total
        </span>
      </div>

      {auditQuery.isPending && !auditQuery.data ? (
        <div className="flex flex-col gap-2">
          {AUDIT_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-11 w-full" />
          ))}
        </div>
      ) : (
        <>
          {auditQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load audit entries</AlertTitle>
              <AlertDescription>
                {getErrorMessage(auditQuery.error)}
              </AlertDescription>
            </Alert>
          ) : null}
          <AppDataTable
            columns={auditTableColumns}
            data={auditQuery.data?.items ?? []}
            density="compact"
            emptyDescription="No access-control history has been recorded yet."
            emptyTitle="No audit entries"
            getRowId={(row) => getAuditEntryKey(row)}
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
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              totalCount: auditQuery.data?.totalCount ?? 0,
            }}
          />
        </>
      )}
    </PageShell>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to load audit log.";
}

function getAuditEntryKey(row: {
  action: string;
  createdAt: string;
  permissionKey: string | null;
  roleSlug: string | null;
  targetUserName: string | null;
}) {
  return [
    row.createdAt,
    row.action,
    row.permissionKey ?? row.roleSlug ?? "global",
    row.targetUserName ?? "system-target",
  ].join(":");
}

function replaceAuditQuery(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  updates: Record<string, number | string | null>,
) {
  const nextSearch = buildSearchParams(searchParams, updates);
  const href = nextSearch ? `${pathname}?${nextSearch}` : pathname;

  router.replace(toRoute(href), { scroll: false });
}
