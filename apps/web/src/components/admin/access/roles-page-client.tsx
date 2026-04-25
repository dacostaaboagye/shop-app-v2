"use client";

import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminDirectoryFilterPanel } from "@/components/admin/admin-directory-filter-panel";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { StockWorkspaceTableSkeleton } from "@/components/stock/stock-workspace-feedback";
import { AppErrorBanner } from "@/components/system/app-error";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { PermissionGate } from "@/components/system/permission-gate";
import { buttonVariants } from "@/components/ui/button";
import { formatCount } from "@/lib/display/format";
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
          value={rolesQuery.data?.totalCount ?? 0}
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

      <AdminDirectoryFilterPanel
        hasFilters={hasFilters}
        onClear={() =>
          replaceRolesQuery(router, pathname, searchParams, {
            page: null,
            q: null,
          })
        }
        onDraftSearchChange={setDraftSearch}
        placeholder="Name, slug, or description"
        searchId="roles-filter-search"
        summary={`${formatCount(rolesQuery.data?.totalCount ?? 0)} roles${draftSearch ? " matching the current search" : " across the access catalogue"}`}
        value={draftSearch}
      />

      <AppTableWrapper>
        {rolesQuery.isPending && !rolesQuery.data ? (
          <StockWorkspaceTableSkeleton keys={ROLE_SKELETON_KEYS} />
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
