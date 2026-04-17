"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, ShieldCheck, UserCheck, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppDataTable } from "@/components/data-table/app-data-table";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminRolesQueryKey,
  fetchAdminRoles,
} from "@/lib/react-query/admin-access";
import {
  currentUserPermissionsQueryKey,
  fetchCurrentUserPermissions,
} from "@/lib/react-query/auth";
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
  const currentPermissionsQuery = useQuery({
    queryFn: fetchCurrentUserPermissions,
    queryKey: currentUserPermissionsQueryKey,
  });
  const canManageRoles =
    currentPermissionsQuery.data?.permissions.includes("access.roles.manage") ??
    false;
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
          canManageRoles ? (
            <Link
              className={buttonVariants({ size: "sm" })}
              href={toRoute("/admin/access/roles/new")}
            >
              New role
            </Link>
          ) : undefined
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(event) => setDraftSearch(event.target.value)}
            placeholder="Search roles by name, slug, or description"
            value={draftSearch}
          />
        </div>
        {hasFilters ? (
          <Button
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
            <X data-icon="inline-start" />
            Clear
          </Button>
        ) : null}
        <span className="ml-auto text-sm tabular-nums text-muted-foreground">
          {rolesQuery.data?.totalCount ?? 0} total
        </span>
      </div>

      {rolesQuery.isPending && !rolesQuery.data ? (
        <div className="flex flex-col gap-2">
          {ROLE_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-11 w-full" />
          ))}
        </div>
      ) : (
        <>
          {rolesQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load roles</AlertTitle>
              <AlertDescription>
                {getRolesErrorMessage(rolesQuery.error)}
              </AlertDescription>
            </Alert>
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
    </PageShell>
  );
}
