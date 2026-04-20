"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchAdminPermissions,
  fetchAdminRoles,
} from "@/lib/react-query/admin-access";
import {
  adminLocationsQueryKey,
  fetchAdminLocations,
} from "@/lib/react-query/admin-directory";
import {
  adminUserAccessDetailQueryKey,
  fetchAdminUserAccessDetail,
} from "@/lib/react-query/admin-user-access";
import { toRoute } from "@/lib/routes";
import { UserAccessManageBody } from "./user-access-manage-body";
import { getQueryErrorMessage } from "./user-access-manage-support";

export function UserAccessManagePageClient({ slug }: { slug: string }) {
  const router = useRouter();
  const { can } = useAuthorization();
  const detailQuery = useQuery({
    queryFn: () => fetchAdminUserAccessDetail(slug),
    queryKey: adminUserAccessDetailQueryKey(slug),
  });
  const permissionsQuery = useQuery({
    queryFn: () => fetchAdminPermissions({ page: 1, pageSize: 100, q: "" }),
    queryKey: ["admin", "access", "permissions-catalogue"],
  });
  const rolesQuery = useQuery({
    queryFn: () => fetchAdminRoles({ page: 1, pageSize: 100, q: "" }),
    queryKey: ["admin", "access", "roles-catalogue"],
  });
  const locationsQuery = useQuery({
    queryFn: () =>
      fetchAdminLocations({
        dir: "asc",
        page: 1,
        pageSize: 100,
        q: "",
        sort: "name",
        status: "active",
        type: "all",
      }),
    queryKey: adminLocationsQueryKey({
      dir: "asc",
      page: 1,
      pageSize: 100,
      q: "",
      sort: "name",
      status: "active",
      type: "all",
    }),
  });
  const canManage = can("access.assignments.manage");
  const isLoading =
    detailQuery.isPending ||
    permissionsQuery.isPending ||
    rolesQuery.isPending ||
    locationsQuery.isPending;
  const isError =
    detailQuery.isError ||
    permissionsQuery.isError ||
    rolesQuery.isError ||
    locationsQuery.isError;

  useEffect(() => {
    if (!canManage) {
      router.replace(toRoute("/no-access"));
    }
  }, [canManage, router]);

  return (
    <PageShell>
      <PageHeader
        backHref={toRoute(`/admin/access/users/${encodeURIComponent(slug)}`)}
        backLabel="User access"
        description="Assign and revoke roles. Allow or deny individual permissions with an audit reason."
        eyebrow="Access management"
        title="Manage roles & permissions"
      />

      {isLoading && !detailQuery.data ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : isError ? (
        <AppErrorBanner
          detail={getQueryErrorMessage(
            detailQuery.isError ? detailQuery.error : null,
            permissionsQuery.isError ? permissionsQuery.error : null,
            rolesQuery.isError ? rolesQuery.error : null,
            locationsQuery.isError ? locationsQuery.error : null,
          )}
          error={
            detailQuery.isError
              ? detailQuery.error
              : permissionsQuery.isError
                ? permissionsQuery.error
                : rolesQuery.isError
                  ? rolesQuery.error
                  : locationsQuery.isError
                    ? locationsQuery.error
                    : undefined
          }
          onRetry={() => {
            void detailQuery.refetch();
            void permissionsQuery.refetch();
            void rolesQuery.refetch();
            void locationsQuery.refetch();
          }}
          title="Unable to load access data"
        />
      ) : detailQuery.data &&
        permissionsQuery.data &&
        rolesQuery.data &&
        locationsQuery.data ? (
        <UserAccessManageBody
          allLocations={locationsQuery.data.items}
          allPermissions={permissionsQuery.data.items}
          allRoles={rolesQuery.data.items}
          canManage={canManage}
          slug={slug}
          user={detailQuery.data}
        />
      ) : null}
    </PageShell>
  );
}
