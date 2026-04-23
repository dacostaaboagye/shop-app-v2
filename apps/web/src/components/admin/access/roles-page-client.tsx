"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, ShieldCheck, UserCheck, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { AppErrorBanner } from "@/components/system/app-error";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { PermissionGate } from "@/components/system/permission-gate";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminRolesQueryKey,
  fetchAdminRoles,
} from "@/lib/react-query/admin-access";
import { toRoute } from "@/lib/routes";
import {
  getPageCount,
  readPositiveIntParam,
  readStringParam,
} from "@/lib/url-state";
import { roleTableColumns } from "./role-table-columns";
import {
  getRolesErrorMessage,
  ROLE_PAGE_SIZE_OPTIONS,
  ROLE_SKELETON_KEYS,
  replaceRolesQuery,
} from "./roles-page-client.support";

export function RolesPageClient() {
  const { can } = useAuthorization();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftSearch, setDraftSearch] = useState(
    readStringParam(searchParams, "q"),
  );
  const q = readStringParam(searchParams, "q");
  const rawPageSize = readPositiveIntParam(searchParams, "pageSize", 10);
  const pageSize = ROLE_PAGE_SIZE_OPTIONS.includes(
    rawPageSize as (typeof ROLE_PAGE_SIZE_OPTIONS)[number],
  )
    ? rawPageSize
    : 10;
  const page = readPositiveIntParam(searchParams, "page", 1);
  const rolesQuery = useQuery({
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchAdminRoles({ page, pageSize, q }),
    queryKey: adminRolesQueryKey({ page, pageSize, q }),
  });
  const canManageRoles = can("access.roles.manage");
  const totalPages = getPageCount(rolesQuery.data?.totalCount ?? 0, pageSize);
  const safePage = Math.min(page, totalPages);
  const hasFilters = q !== "";
  const visibleSystemRoles =
    rolesQuery.data?.items.filter((role) => role.isSystem).length ?? 0;
  const visibleAssignedUsers =
    rolesQuery.data?.items.reduce(
      (total, role) => total + role.assignedUserCount,
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
      replaceRolesQuery(router, pathname, searchParams, {
        page: null,
        q: draftSearch || null,
      });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [draftSearch, pathname, q, router, searchParams]);

  useEffect(() => {
    if (!rolesQuery.data || safePage === page) {
      return;
    }

    replaceRolesQuery(router, pathname, searchParams, {
      page: safePage === 1 ? null : safePage,
    });
  }, [page, pathname, rolesQuery.data, router, safePage, searchParams]);

  return (
    <PageShell>
      <PageHeader
        actions={
          <PermissionGate permission="access.roles.manage">
            <Link
              className={buttonVariants({ size: "sm" })}
              href={toRoute("/admin/access/roles/new")}
            >
              New role
            </Link>
          </PermissionGate>
        }
        description="Inspect system and custom roles, permission coverage, and current assignment load."
        title="Roles"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="System and custom roles available in the catalogue."
          icon={ShieldCheck}
          label="Total roles"
          value={rolesQuery.data?.totalCount ?? "—"}
        />
        <StatCard
          description="Seeded platform roles visible on the current page."
          icon={UserCheck}
          label="Visible system roles"
          value={visibleSystemRoles}
        />
        <StatCard
          description="Custom roles visible on the current page."
          icon={Users}
          label="Visible custom roles"
          value={(rolesQuery.data?.items.length ?? 0) - visibleSystemRoles}
        />
        <StatCard
          description="Total active user assignments across the visible rows."
          icon={Users}
          label="Visible assignments"
          value={visibleAssignedUsers}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-sm border border-border/50">
        <div className="relative min-w-[320px] flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-10 border-0 bg-muted pl-10 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary/20 transition-all rounded-xl"
            onChange={(event) => setDraftSearch(event.target.value)}
            placeholder="Search roles by name, slug, or description"
            value={draftSearch}
          />
        </div>
        {hasFilters ? (
          <Button
            className="h-10 rounded-xl px-4 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() =>
              replaceRolesQuery(router, pathname, searchParams, {
                page: null,
                q: null,
              })
            }
            size="sm"
            type="button"
            variant="ghost"
          >
            <X className="mr-2 size-4" />
            Clear filters
          </Button>
        ) : null}
        <div className="ml-auto flex items-center gap-3 pr-2">
          <div className="h-4 w-px bg-muted" />
          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground tabular-nums">
            {rolesQuery.data?.totalCount ?? 0} total
          </span>
        </div>
      </div>

      <AppTableWrapper>
        {rolesQuery.isPending && !rolesQuery.data ? (
          <div className="flex flex-col gap-2 p-4">
            {ROLE_SKELETON_KEYS.map((key) => (
              <Skeleton key={key} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {rolesQuery.isError ? (
              <div className="p-8">
                <AppErrorBanner
                  detail={getRolesErrorMessage(rolesQuery.error)}
                  error={rolesQuery.error}
                  onRetry={() => {
                    void rolesQuery.refetch();
                  }}
                  title="Unable to load roles"
                />
              </div>
            ) : null}
            <AppDataTable
              columns={roleTableColumns}
              data={rolesQuery.data?.items ?? []}
              density="compact"
              emptyDescription={
                hasFilters
                  ? "Try a different search term for role names, slugs, or descriptions."
                  : "No roles have been configured yet."
              }
              emptyTitle={hasFilters ? "No roles match" : "No roles available"}
              getRowId={(row) => row.slug}
              pagination={{
                onPageChange: (nextPage) =>
                  replaceRolesQuery(router, pathname, searchParams, {
                    page: nextPage === 1 ? null : nextPage,
                  }),
                onPageSizeChange: (nextPageSize) =>
                  replaceRolesQuery(router, pathname, searchParams, {
                    page: null,
                    pageSize: nextPageSize === 10 ? null : nextPageSize,
                  }),
                page: safePage,
                pageSize,
                pageSizeOptions: ROLE_PAGE_SIZE_OPTIONS,
                totalCount: rolesQuery.data?.totalCount ?? 0,
              }}
              {...(!hasFilters && canManageRoles
                ? {
                    emptyState: {
                      action: (
                        <Link
                          className={buttonVariants({ size: "sm" })}
                          href={toRoute("/admin/access/roles/new")}
                        >
                          Create role
                        </Link>
                      ),
                    },
                  }
                : {})}
            />
          </>
        )}
      </AppTableWrapper>
    </PageShell>
  );
}
