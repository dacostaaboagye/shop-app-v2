"use client";

import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/system/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminUserAccessDetailQueryKey,
  fetchAdminUserAccessDetail,
} from "@/lib/react-query/admin-user-access";
import {
  currentUserPermissionsQueryKey,
  fetchCurrentUserPermissions,
} from "@/lib/react-query/auth";
import { UserAccessDetailBody } from "./user-access-detail-body";

const USER_ACCESS_SKELETON_KEYS = [
  "user-access-stat-1",
  "user-access-stat-2",
  "user-access-stat-3",
  "user-access-stat-4",
] as const;

export function UserAccessDetailPageClient({ slug }: { slug: string }) {
  const detailQuery = useQuery({
    queryFn: () => fetchAdminUserAccessDetail(slug),
    queryKey: adminUserAccessDetailQueryKey(slug),
  });
  const currentPermissionsQuery = useQuery({
    queryFn: fetchCurrentUserPermissions,
    queryKey: currentUserPermissionsQueryKey,
  });
  const canManage =
    currentPermissionsQuery.data?.permissions.includes(
      "access.assignments.manage",
    ) ?? false;

  return (
    <PageShell>
      {detailQuery.isPending && !detailQuery.data ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 w-full" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {USER_ACCESS_SKELETON_KEYS.map((key) => (
              <Skeleton key={key} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : detailQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load user access</AlertTitle>
          <AlertDescription>
            {detailQuery.error instanceof Error
              ? detailQuery.error.message
              : "An unexpected error occurred."}
          </AlertDescription>
        </Alert>
      ) : detailQuery.data ? (
        <UserAccessDetailBody
          canManage={canManage}
          slug={slug}
          user={detailQuery.data}
        />
      ) : null}
    </PageShell>
  );
}
