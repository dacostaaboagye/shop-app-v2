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
import { UserProfileBody } from "./user-profile-body";

const USER_PROFILE_SKELETON_KEYS = [
  "user-profile-stat-1",
  "user-profile-stat-2",
  "user-profile-stat-3",
  "user-profile-stat-4",
] as const;

export function UserProfilePageClient({ slug }: { slug: string }) {
  const detailQuery = useQuery({
    queryFn: () => fetchAdminUserAccessDetail(slug),
    queryKey: adminUserAccessDetailQueryKey(slug),
  });
  const currentPermissionsQuery = useQuery({
    queryFn: fetchCurrentUserPermissions,
    queryKey: currentUserPermissionsQueryKey,
  });
  const canManageAccess =
    currentPermissionsQuery.data?.permissions.includes(
      "access.assignments.manage",
    ) ?? false;
  const canManageMedia =
    currentPermissionsQuery.data?.permissions.includes(
      "catalog.media.manage",
    ) ?? false;

  if (detailQuery.isPending && !detailQuery.data) {
    return (
      <PageShell>
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {USER_PROFILE_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </PageShell>
    );
  }

  if (detailQuery.isError) {
    return (
      <PageShell>
        <Alert variant="destructive">
          <AlertTitle>Unable to load user</AlertTitle>
          <AlertDescription>
            {detailQuery.error instanceof Error
              ? detailQuery.error.message
              : "An unexpected error occurred."}
          </AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  if (!detailQuery.data) {
    return null;
  }

  return (
    <UserProfileBody
      canManageAccess={canManageAccess}
      canManageMedia={canManageMedia}
      slug={slug}
      user={detailQuery.data}
    />
  );
}
