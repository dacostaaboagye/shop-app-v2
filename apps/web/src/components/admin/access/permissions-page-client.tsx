"use client";

import { useQuery } from "@tanstack/react-query";
import { KeyRound, Layers3, Search, ShieldCheck, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { AppErrorBanner } from "@/components/system/app-error";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { buildPermissionGroups } from "@/lib/access-control";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import {
  adminPermissionsQueryKey,
  fetchAdminPermissions,
} from "@/lib/react-query/admin-access";
import { toRoute } from "@/lib/routes";
import {
  buildSearchParams,
  getPageCount,
  readPositiveIntParam,
  readStringParam,
} from "@/lib/url-state";
import { permissionTableColumns } from "./permission-table-columns";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const PERMISSION_SKELETON_KEYS = [
  "permission-row-1",
  "permission-row-2",
  "permission-row-3",
  "permission-row-4",
  "permission-row-5",
  "permission-row-6",
] as const;

export function PermissionsPageClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftSearch, setDraftSearch] = useState(
    readStringParam(searchParams, "q"),
  );
  const q = readStringParam(searchParams, "q");
  const rawPageSize = readPositiveIntParam(searchParams, "pageSize", 25);
  const pageSize = PAGE_SIZE_OPTIONS.includes(
    rawPageSize as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? rawPageSize
    : 25;
  const page = readPositiveIntParam(searchParams, "page", 1);
  const permissionsQuery = useQuery({
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchAdminPermissions({ page, pageSize, q }),
    queryKey: adminPermissionsQueryKey({ page, pageSize, q }),
  });
  const totalPages = getPageCount(
    permissionsQuery.data?.totalCount ?? 0,
    pageSize,
  );
  const safePage = Math.min(page, totalPages);
  const hasFilters = q !== "";
  const visibleGroups = buildPermissionGroups(
    permissionsQuery.data?.items ?? [],
  );
  const visibleCoverage =
    permissionsQuery.data?.items.reduce(
      (total, permission) => total + permission.assignedRoleCount,
      0,
    ) ?? 0;

  useEffect(() => {
    setDraftSearch(q);
  }, [q]);

  useEffect(() => {
    if (draftSearch === q) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      replacePermissionsQuery(router, pathname, searchParams, {
        page: null,
        q: draftSearch || null,
      });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [draftSearch, pathname, q, router, searchParams]);

  useEffect(() => {
    if (!permissionsQuery.data || safePage === page) {
      return;
    }

    replacePermissionsQuery(router, pathname, searchParams, {
      page: safePage === 1 ? null : safePage,
    });
  }, [page, pathname, permissionsQuery.data, router, safePage, searchParams]);

  return (
    <PageShell>
      <PageHeader
        description="Inspect the canonical permission catalogue and how role coverage maps to each page or action surface."
        title="Permissions"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="Canonical permission keys available for role grants and overrides."
          icon={KeyRound}
          label="Total permissions"
          value={permissionsQuery.data?.totalCount ?? "—"}
        />
        <StatCard
          description="Operational permission surfaces visible on the current page."
          icon={Layers3}
          label="Visible surfaces"
          value={visibleGroups.length}
        />
        <StatCard
          description="Role-to-permission relationships on the current result set."
          icon={ShieldCheck}
          label="Visible role coverage"
          value={visibleCoverage}
        />
        <StatCard
          description="Search results currently displayed in the table."
          icon={Search}
          label="Visible permissions"
          value={permissionsQuery.data?.items.length ?? 0}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(event) => setDraftSearch(event.target.value)}
            placeholder="Search permissions by key or description"
            value={draftSearch}
          />
        </div>
        {hasFilters ? (
          <Button
            onClick={() =>
              replacePermissionsQuery(router, pathname, searchParams, {
                page: null,
                q: null,
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
        <span className="ml-auto text-sm tabular-nums text-muted-foreground">
          {permissionsQuery.data?.totalCount ?? 0} total
        </span>
      </div>

      {permissionsQuery.isPending && !permissionsQuery.data ? (
        <div className="flex flex-col gap-2">
          {PERMISSION_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-11 w-full" />
          ))}
        </div>
      ) : (
        <>
          {permissionsQuery.isError ? (
            <AppErrorBanner
              detail={getErrorMessage(permissionsQuery.error)}
              error={permissionsQuery.error}
              onRetry={() => {
                void permissionsQuery.refetch();
              }}
              title="Unable to load permissions"
            />
          ) : null}
          <AppDataTable
            columns={permissionTableColumns}
            data={permissionsQuery.data?.items ?? []}
            density="compact"
            emptyDescription={
              hasFilters
                ? "Try a different permission key or description."
                : "No permissions have been seeded yet."
            }
            emptyTitle={
              hasFilters ? "No permissions match" : "No permissions available"
            }
            getRowId={(row) => row.key}
            pagination={{
              onPageChange: (nextPage) =>
                replacePermissionsQuery(router, pathname, searchParams, {
                  page: nextPage === 1 ? null : nextPage,
                }),
              onPageSizeChange: (nextPageSize) =>
                replacePermissionsQuery(router, pathname, searchParams, {
                  page: null,
                  pageSize: nextPageSize === 25 ? null : nextPageSize,
                }),
              page: safePage,
              pageSize,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              totalCount: permissionsQuery.data?.totalCount ?? 0,
            }}
          />
        </>
      )}
    </PageShell>
  );
}

function getErrorMessage(error: unknown) {
  return getAppErrorMessage(error, {
    fallbackDetail: "Failed to load permissions.",
  });
}

function replacePermissionsQuery(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  updates: Record<string, number | string | null>,
) {
  const nextSearch = buildSearchParams(searchParams, updates);
  const href = nextSearch ? `${pathname}?${nextSearch}` : pathname;

  router.replace(toRoute(href), { scroll: false });
}
