"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchAdminPermissions,
  fetchAdminRoles,
} from "@/lib/react-query/admin-access";
import {
  adminUserAccessDetailQueryKey,
  fetchAdminUserAccessDetail,
} from "@/lib/react-query/admin-user-access";
import {
  currentUserPermissionsQueryKey,
  fetchCurrentUserPermissions,
} from "@/lib/react-query/auth";
import { toRoute } from "@/lib/routes";
import { UserAccessManageBody } from "./user-access-manage-body";
import { getQueryErrorMessage } from "./user-access-manage-support";

export function UserAccessManagePageClient({ slug }: { slug: string }) {
  const detailQuery = useQuery({
    queryFn: () => fetchAdminUserAccessDetail(slug),
    queryKey: adminUserAccessDetailQueryKey(slug),
  });
  const currentPermissionsQuery = useQuery({
    queryFn: fetchCurrentUserPermissions,
    queryKey: currentUserPermissionsQueryKey,
  });
  const permissionsQuery = useQuery({
    queryFn: () => fetchAdminPermissions({ page: 1, pageSize: 100, q: "" }),
    queryKey: ["admin", "access", "permissions-catalogue"],
  });
  const rolesQuery = useQuery({
    queryFn: () => fetchAdminRoles({ page: 1, pageSize: 100, q: "" }),
    queryKey: ["admin", "access", "roles-catalogue"],
  });
  const canManage =
    currentPermissionsQuery.data?.permissions.includes(
      "access.assignments.manage",
    ) ?? false;
  const isLoading =
    detailQuery.isPending || permissionsQuery.isPending || rolesQuery.isPending;
  const isError =
    detailQuery.isError || permissionsQuery.isError || rolesQuery.isError;

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
        <Alert variant="destructive">
          <AlertTitle>Unable to load access data</AlertTitle>
          <AlertDescription>
            {getQueryErrorMessage(
              detailQuery.isError ? detailQuery.error : null,
              permissionsQuery.isError ? permissionsQuery.error : null,
              rolesQuery.isError ? rolesQuery.error : null,
            )}
          </AlertDescription>
        </Alert>
      ) : detailQuery.data && permissionsQuery.data && rolesQuery.data ? (
        <UserAccessManageBody
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
